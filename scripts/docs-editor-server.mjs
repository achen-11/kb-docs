import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, open, readFile, realpath, rename, rm, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_MAX_DOCUMENT_BYTES,
  DocumentConflictError,
  DocumentValidationError,
  createDraftCoordinator,
} from './docs-editor-draft.mjs'
import { WorkspaceOperationError, createWorkspaceCoordinator } from './docs-editor-workspace.mjs'
import { DEFAULT_MAX_MEDIA_BYTES, MediaOperationError, createMediaCoordinator } from './docs-editor-media.mjs'
import { PublishOperationError, createPublishCoordinator } from './docs-editor-publish.mjs'
import { PUBLISHED_VERIFY_PATHS } from './docs-publish-locale.mjs'
import { withPreviewLock } from './run-with-preview-lock.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultProjectRoot = path.resolve(__dirname, '..')
const SESSION_COOKIE = 'kb_docs_editor_session'
const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000
const MAX_BODY_BYTES = Math.max(DEFAULT_MAX_DOCUMENT_BYTES + 64 * 1024, Math.ceil(DEFAULT_MAX_MEDIA_BYTES * 4 / 3) + 128 * 1024)

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
])

export class EditorHttpError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.name = 'EditorHttpError'
    this.statusCode = statusCode
  }
}

function readPositiveInteger(value, fallback, name, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`)
  }
  return parsed
}

function assertBindHost(value) {
  if (!value || /[\r\n\0]/u.test(value)) throw new Error('editor host is invalid')
  return value
}

function readBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'boolean') return value
  if (String(value).toLowerCase() === 'true') return true
  if (String(value).toLowerCase() === 'false') return false
  throw new Error('boolean configuration must be true or false')
}

function assertAbsolutePath(value, name) {
  if (!path.isAbsolute(value) || /[\r\n\0]/u.test(value)) throw new Error(`${name} must be an absolute path`)
  return path.normalize(value)
}

function assertHttpUrl(value, name) {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error(`${name} must be an http or https URL without credentials`)
  }
  return url.toString()
}

function assertGitRemote(value) {
  if (!/^[A-Za-z0-9._-]+$/u.test(value)) throw new Error('Git remote name contains unsupported characters')
  return value
}

function assertGitBranch(value) {
  if (
    !value || value.startsWith('-') || value.startsWith('/') || value.endsWith('/') || value.endsWith('.') ||
    value.includes('..') || value.includes('//') || value.includes('@{') ||
    /[\s~^:?*\[\\\x00-\x1f\x7f]/u.test(value) ||
    value.split('/').some((part) => !part || part.startsWith('.') || part.endsWith('.lock'))
  ) throw new Error('Git branch name is invalid')
  return value
}

function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

export function normalizeDocumentPath(value) {
  if (typeof value !== 'string' || !value || value.length > 512) {
    throw new EditorHttpError(400, 'Document path is required')
  }
  if (value.includes('\0') || value.includes('\\') || path.posix.isAbsolute(value)) {
    throw new EditorHttpError(400, 'Document path is invalid')
  }

  const normalized = path.posix.normalize(value)
  const segments = normalized.split('/')
  if (
    normalized !== value ||
    !normalized.startsWith('docs/') ||
    !normalized.endsWith('.md') ||
    segments.some((segment) => !segment || segment === '..' || segment.startsWith('.'))
  ) {
    throw new EditorHttpError(400, 'Only existing docs/**/*.md files are allowed')
  }

  return normalized
}

export async function readDocument(projectRoot, requestedPath) {
  const normalizedPath = normalizeDocumentPath(requestedPath)
  const docsRoot = await realpath(path.join(projectRoot, 'docs'))
  let filePath
  try {
    filePath = await realpath(path.join(projectRoot, normalizedPath))
  } catch (error) {
    if (error?.code === 'ENOENT') throw new EditorHttpError(404, 'Document does not exist')
    throw error
  }
  if (!isPathInside(docsRoot, filePath)) {
    throw new EditorHttpError(400, 'Document path escapes the docs directory')
  }

  const metadata = await stat(filePath)
  if (!metadata.isFile()) throw new EditorHttpError(404, 'Document does not exist')
  const content = await readFile(filePath, 'utf8')
  return {
    path: normalizedPath,
    content,
    hash: createHash('sha256').update(content).digest('hex'),
    bytes: Buffer.byteLength(content),
    modifiedAt: metadata.mtime.toISOString(),
  }
}

function localeDocumentPaths(requestedPath) {
  const normalizedPath = normalizeDocumentPath(requestedPath)
  if (normalizedPath.startsWith('docs/en/')) {
    return { active: 'en', en: normalizedPath, zh: `docs/${normalizedPath.slice('docs/en/'.length)}` }
  }
  return { active: 'zh', en: `docs/en/${normalizedPath.slice('docs/'.length)}`, zh: normalizedPath }
}

async function documentExists(projectRoot, requestedPath) {
  try {
    await readDocument(projectRoot, requestedPath)
    return true
  } catch (error) {
    if (error instanceof EditorHttpError && error.statusCode === 404) return false
    throw error
  }
}

export async function getDocumentLocales(projectRoot, requestedPath) {
  const paths = localeDocumentPaths(requestedPath)
  const [zhExists, enExists] = await Promise.all([
    documentExists(projectRoot, paths.zh),
    documentExists(projectRoot, paths.en),
  ])
  return {
    active: paths.active,
    zh: { path: paths.zh, exists: zhExists },
    en: { path: paths.en, exists: enExists },
  }
}

async function writeDraftMarker(draftStateFile, document) {
  await mkdir(path.dirname(draftStateFile), { recursive: true })
  const state = {
    schemaVersion: 1,
    active: true,
    updatedAt: new Date().toISOString(),
    lastDocument: document.path,
    lastHash: document.hash,
  }
  const temporaryFile = `${draftStateFile}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`
  let handle
  try {
    handle = await open(temporaryFile, 'wx', 0o640)
    await handle.writeFile(`${JSON.stringify(state, null, 2)}\n`, 'utf8')
    await handle.sync()
    await handle.close()
    handle = undefined
    await rename(temporaryFile, draftStateFile)
  } catch (error) {
    await handle?.close().catch(() => undefined)
    await rm(temporaryFile, { force: true })
    throw error
  }
}

export async function createLocaleDocument(projectRoot, requestedPath, locale, draftStateFile) {
  if (!['zh', 'en'].includes(locale)) throw new EditorHttpError(400, 'Locale must be zh or en')
  const paths = localeDocumentPaths(requestedPath)
  const targetPath = paths[locale]
  if (await documentExists(projectRoot, targetPath)) throw new EditorHttpError(409, 'Locale document already exists')
  const sourcePath = paths[locale === 'en' ? 'zh' : 'en']
  const source = await readDocument(projectRoot, sourcePath)
  const projectRealPath = await realpath(path.resolve(projectRoot))
  const docsRoot = await realpath(path.join(projectRealPath, 'docs'))
  const targetFile = path.resolve(projectRealPath, targetPath)
  if (!isPathInside(docsRoot, targetFile)) throw new EditorHttpError(400, 'Document path escapes the docs directory')
  await mkdir(path.dirname(targetFile), { recursive: true })
  const temporaryFile = path.join(path.dirname(targetFile), `.${path.basename(targetFile)}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`)
  let handle
  try {
    handle = await open(temporaryFile, 'wx', 0o640)
    await handle.writeFile(source.content, 'utf8')
    await handle.sync()
    await handle.close()
    handle = undefined
    await rename(temporaryFile, targetFile)
  } catch (error) {
    await handle?.close().catch(() => undefined)
    await rm(temporaryFile, { force: true })
    throw error
  }
  const document = await readDocument(projectRoot, targetPath)
  if (draftStateFile) await writeDraftMarker(draftStateFile, document)
  return document
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left))
  const rightBuffer = Buffer.from(String(right))
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function parseCookies(header) {
  const cookies = new Map()
  for (const item of String(header || '').split(';')) {
    const index = item.indexOf('=')
    if (index <= 0) continue
    cookies.set(item.slice(0, index).trim(), decodeURIComponent(item.slice(index + 1).trim()))
  }
  return cookies
}

function createSessionStore(ttlMs) {
  const sessions = new Map()

  function prune() {
    const now = Date.now()
    for (const [sessionId, expiresAt] of sessions) {
      if (expiresAt <= now) sessions.delete(sessionId)
    }
  }

  return {
    create() {
      prune()
      const sessionId = randomBytes(32).toString('base64url')
      sessions.set(sessionId, Date.now() + ttlMs)
      return sessionId
    },
    has(sessionId) {
      prune()
      return Boolean(sessionId && sessions.has(sessionId))
    },
    delete(sessionId) {
      if (sessionId) sessions.delete(sessionId)
    },
  }
}

function createLoginLimiter() {
  const attempts = new Map()
  const windowMs = 5 * 60 * 1000
  const maximum = 8

  return {
    assertAllowed(key) {
      const now = Date.now()
      const current = attempts.get(key)
      if (!current || current.resetAt <= now) {
        attempts.set(key, { count: 0, resetAt: now + windowMs })
        return
      }
      if (current.count >= maximum) {
        throw new EditorHttpError(429, 'Too many login attempts; try again later')
      }
    },
    recordFailure(key) {
      const current = attempts.get(key) || { count: 0, resetAt: Date.now() + windowMs }
      current.count += 1
      attempts.set(key, current)
    },
    clear(key) {
      attempts.delete(key)
    },
  }
}

function securityHeaders(contentType, previewFrameOrigin = "'none'") {
  return {
    'Content-Type': contentType,
    'Content-Security-Policy':
      `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-src ${previewFrameOrigin}; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`,
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Robots-Tag': 'noindex, nofollow',
  }
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  const body = `${JSON.stringify(payload)}\n`
  response.writeHead(statusCode, {
    ...securityHeaders('application/json; charset=utf-8'),
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  })
  response.end(body)
}

function sendEmpty(response, statusCode, extraHeaders = {}) {
  response.writeHead(statusCode, {
    ...securityHeaders('application/json; charset=utf-8'),
    'Cache-Control': 'no-store',
    ...extraHeaders,
  })
  response.end()
}

async function readJsonBody(request) {
  const chunks = []
  let total = 0
  for await (const chunk of request) {
    total += chunk.length
    if (total > MAX_BODY_BYTES) throw new EditorHttpError(413, 'Request body is too large')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new EditorHttpError(400, 'Request body must be valid JSON')
  }
}

async function readAuthToken(input) {
  const token = input.authToken ?? (input.authTokenFile ? await readFile(input.authTokenFile, 'utf8') : '')
  const normalized = String(token).trim()
  if (normalized.length < 12) throw new Error('editor authentication token must be at least 12 characters')
  return normalized
}

async function normalizeConfig(input = {}) {
  const projectRoot = path.resolve(input.projectRoot || process.env.DOCS_EDITOR_PROJECT_ROOT || defaultProjectRoot)
  const previewRoot = path.resolve(
    input.previewRoot || process.env.DOCS_EDITOR_PREVIEW_ROOT || path.join(projectRoot, '.local-preview')
  )
  const fastPreviewBaseUrl = assertHttpUrl(
    input.fastPreviewBaseUrl ||
      input.previewBaseUrl ||
      process.env.DOCS_EDITOR_FAST_PREVIEW_PUBLIC_URL ||
      process.env.DOCS_EDITOR_PREVIEW_PUBLIC_URL ||
      'http://127.0.0.1:4173',
    'fast preview public URL'
  ).replace(/\/$/u, '')
  const stablePreviewBaseUrl = assertHttpUrl(
    input.stablePreviewBaseUrl ||
      process.env.DOCS_EDITOR_STABLE_PREVIEW_PUBLIC_URL ||
      'http://127.0.0.1:4175',
    'stable preview public URL'
  ).replace(/\/$/u, '')
  const productionPublishEnabled = readBoolean(
    input.productionPublishEnabled ?? process.env.DOCS_EDITOR_PRODUCTION_PUBLISH_ENABLED,
    false
  )
  const productionPublishTargetValue =
    input.productionPublishTarget || process.env.DOCS_EDITOR_KOOBOO_TARGET_URL || ''
  if (productionPublishEnabled && !productionPublishTargetValue) {
    throw new Error('DOCS_EDITOR_KOOBOO_TARGET_URL is required when production publishing is enabled')
  }
  return {
    authToken: await readAuthToken({
      authToken: input.authToken,
      authTokenFile: input.authTokenFile || process.env.DOCS_EDITOR_AUTH_TOKEN_FILE,
    }),
    distDir: path.resolve(
      input.distDir || process.env.DOCS_EDITOR_DIST_DIR || path.join(projectRoot, 'editor', 'dist')
    ),
    host: assertBindHost(input.host || process.env.DOCS_EDITOR_HOST || '127.0.0.1'),
    port: readPositiveInteger(input.port ?? process.env.DOCS_EDITOR_PORT, 4174, 'editor port', 65535),
    auditLog: path.resolve(
      input.auditLog || process.env.DOCS_EDITOR_AUDIT_LOG || path.join(previewRoot, 'editor-audit.jsonl')
    ),
    draftStateFile: path.resolve(
      input.draftStateFile ||
        process.env.DOCS_EDITOR_DRAFT_STATE_FILE ||
        path.join(previewRoot, '.editor-draft.json')
    ),
    lockFile: path.resolve(
      input.lockFile ||
        process.env.DOCS_EDITOR_UPDATE_LOCK_FILE ||
        path.join(previewRoot, '.update.lock')
    ),
    lockTimeoutMs: readPositiveInteger(
      input.lockTimeoutMs ?? process.env.DOCS_EDITOR_UPDATE_LOCK_TIMEOUT_MS,
      180_000,
      'preview update lock timeout',
      3_600_000
    ),
    buildDebounceMs: readPositiveInteger(
      input.buildDebounceMs ?? process.env.DOCS_EDITOR_STABLE_BUILD_DEBOUNCE_MS,
      8_000,
      'stable preview build debounce',
      300_000
    ),
    maximumDocumentBytes: readPositiveInteger(
      input.maximumDocumentBytes ?? process.env.DOCS_EDITOR_MAX_DOCUMENT_BYTES,
      DEFAULT_MAX_DOCUMENT_BYTES,
      'maximum document bytes',
      16 * 1024 * 1024
    ),
    maximumMediaBytes: readPositiveInteger(
      input.maximumMediaBytes ?? process.env.DOCS_EDITOR_MAX_MEDIA_BYTES,
      DEFAULT_MAX_MEDIA_BYTES,
      'maximum media bytes',
      32 * 1024 * 1024
    ),
    fastPreviewBaseUrl,
    gitBranch: assertGitBranch(input.gitBranch || process.env.DOCS_PREVIEW_GIT_BRANCH || 'main'),
    gitRemote: assertGitRemote(input.gitRemote || process.env.DOCS_PREVIEW_GIT_REMOTE || 'origin'),
    fastPreviewHealthUrl: assertHttpUrl(
      input.fastPreviewHealthUrl ||
        process.env.DOCS_EDITOR_FAST_PREVIEW_HEALTH_URL ||
        'http://127.0.0.1:4173/',
      'fast preview health URL'
    ),
    previewEnvFile: path.resolve(
      input.previewEnvFile ||
        process.env.DOCS_EDITOR_PREVIEW_ENV_FILE ||
        '/etc/kb-docs-preview/preview.env'
    ),
    previewFrameOrigin: new URL(fastPreviewBaseUrl).origin,
    previewRoot,
    productionPublishEnabled,
    productionPublishTarget: productionPublishTargetValue
      ? assertHttpUrl(productionPublishTargetValue, 'Kooboo publish target URL').replace(/\/$/u, '')
      : '',
    publishArtifactDir: assertAbsolutePath(
      input.publishArtifactDir || process.env.DOCS_EDITOR_KOOBOO_ARTIFACT_DIR || '/srv/kb-docs-kooboo-artifact',
      'Kooboo artifact directory'
    ),
    publishBaselineFile: assertAbsolutePath(
      input.publishBaselineFile ||
        process.env.DOCS_EDITOR_KOOBOO_BASELINE_FILE ||
        path.join(previewRoot, 'kooboo-deploy-baseline.json'),
      'Kooboo deployment baseline file'
    ),
    publishInitialBaselineCommit:
      input.publishInitialBaselineCommit || process.env.DOCS_EDITOR_KOOBOO_INITIAL_BASELINE || '',
    publishVerifyPaths:
      input.publishVerifyPaths || process.env.DOCS_EDITOR_KOOBOO_VERIFY_PATHS || PUBLISHED_VERIFY_PATHS,
    stablePreviewBaseUrl,
    stablePreviewStatusUrl: assertHttpUrl(
      input.stablePreviewStatusUrl ||
        input.previewStatusUrl ||
        process.env.DOCS_EDITOR_STABLE_PREVIEW_STATUS_URL ||
        process.env.DOCS_EDITOR_PREVIEW_STATUS_URL ||
        'http://127.0.0.1:4175/__preview/status',
      'stable preview status URL'
    ),
    projectRoot,
    secureCookie:
      input.secureCookie ?? String(process.env.DOCS_EDITOR_SECURE_COOKIE || '').toLowerCase() === 'true',
    sessionTtlMs: readPositiveInteger(
      input.sessionTtlMs,
      DEFAULT_SESSION_TTL_MS,
      'session TTL',
      7 * 24 * 60 * 60 * 1000
    ),
  }
}

async function fetchPreviewStatus(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) })
  if (!response.ok) throw new Error(`Preview status returned HTTP ${response.status}`)
  return response.json()
}

async function fetchFastPreview(url) {
  const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) })
  if (!response.ok) throw new Error(`Fast preview returned HTTP ${response.status}`)
  return { available: true }
}

async function resolvePreviewStatus(config) {
  const [fastResult, stableResult] = await Promise.allSettled([
    fetchFastPreview(config.fastPreviewHealthUrl),
    fetchPreviewStatus(config.stablePreviewStatusUrl),
  ])
  return {
    fast:
      fastResult.status === 'fulfilled'
        ? fastResult.value
        : { available: false, error: publicFetchError(fastResult.reason) },
    stable:
      stableResult.status === 'fulfilled'
        ? { available: true, status: stableResult.value }
        : { available: false, error: publicFetchError(stableResult.reason) },
  }
}

function publicFetchError(error) {
  return error instanceof Error ? error.message : String(error)
}

function publicPublishStatus(status) {
  if (!status || typeof status !== 'object') return status
  const {
    artifactCommit: _privateArtifactCommit,
    fromArtifactCommit: _privateFromArtifactCommit,
    logTail: _privateLogTail,
    planDigest: _privatePlanDigest,
    ...publicStatus
  } = status
  return publicStatus
}

async function sendStaticFile(config, request, requestPath, response) {
  const decodedPath = decodeURIComponent(requestPath)
  if (decodedPath.includes('\0') || decodedPath.includes('\\')) {
    throw new EditorHttpError(400, 'Static path is invalid')
  }
  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '')
  let candidate = path.resolve(config.distDir, relativePath)
  if (!isPathInside(config.distDir, candidate)) throw new EditorHttpError(400, 'Static path is invalid')

  let metadata
  try {
    metadata = await stat(candidate)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  if (!metadata?.isFile()) {
    if (path.extname(relativePath)) throw new EditorHttpError(404, 'Static asset not found')
    candidate = path.join(config.distDir, 'index.html')
    metadata = await stat(candidate).catch(() => null)
  }
  if (!metadata?.isFile()) throw new EditorHttpError(503, 'Editor assets are not built')

  const body = await readFile(candidate)
  const extension = path.extname(candidate).toLowerCase()
  const isIndex = path.basename(candidate) === 'index.html'
  response.writeHead(200, {
    ...securityHeaders(
      contentTypes.get(extension) || 'application/octet-stream',
      config.previewFrameOrigin
    ),
    'Cache-Control': isIndex ? 'no-store' : 'public, max-age=31536000, immutable',
    'Content-Length': body.length,
  })
  response.end(request.method === 'HEAD' ? undefined : body)
}

export async function createDocsEditorServer(input = {}) {
  const config = await normalizeConfig(input)
  const sessions = createSessionStore(config.sessionTtlMs)
  const loginLimiter = createLoginLimiter()
  const draftCoordinator =
    input.draftCoordinator ||
    createDraftCoordinator({
      projectRoot: config.projectRoot,
      previewRoot: config.previewRoot,
      previewEnvFile: config.previewEnvFile,
      draftStateFile: config.draftStateFile,
      auditLog: config.auditLog,
      lockFile: config.lockFile,
      lockTimeoutMs: config.lockTimeoutMs,
      maximumBytes: config.maximumDocumentBytes,
      buildDebounceMs: config.buildDebounceMs,
      buildCommand: input.buildCommand,
      readDocument,
      normalizeDocumentPath,
    })
  const workspaceCoordinator =
    input.workspaceCoordinator ||
    createWorkspaceCoordinator({
      projectRoot: config.projectRoot,
      draftStateFile: config.draftStateFile,
      auditLog: config.auditLog,
      lockFile: config.lockFile,
      lockTimeoutMs: config.lockTimeoutMs,
      gitRemote: config.gitRemote,
      gitBranch: config.gitBranch,
    })
  const mediaCoordinator =
    input.mediaCoordinator ||
    createMediaCoordinator({
      projectRoot: config.projectRoot,
      draftStateFile: config.draftStateFile,
      auditLog: config.auditLog,
      lockFile: config.lockFile,
      lockTimeoutMs: config.lockTimeoutMs,
      maximumBytes: config.maximumMediaBytes,
    })
  const publishCoordinator =
    input.publishCoordinator ||
    createPublishCoordinator({
      enabled: config.productionPublishEnabled,
      projectRoot: config.projectRoot,
      artifactDir: config.publishArtifactDir,
      baselineFile: config.publishBaselineFile,
      initialBaselineCommit: config.publishInitialBaselineCommit,
      targetUrl: config.productionPublishTarget,
      verifyPaths: config.publishVerifyPaths,
      auditLog: config.auditLog,
      lockFile: config.lockFile,
      lockTimeoutMs: Math.max(config.lockTimeoutMs, 3_600_000),
    })

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
      const sessionId = parseCookies(request.headers.cookie).get(SESSION_COOKIE)
      const authenticated = sessions.has(sessionId)

      if (request.method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, { status: 'ready', mode: 'draft' })
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/session') {
        sendJson(response, 200, { authenticated })
        return
      }
      if (request.method === 'POST' && url.pathname === '/api/session') {
        const clientKey = request.socket.remoteAddress || 'unknown'
        loginLimiter.assertAllowed(clientKey)
        const body = await readJsonBody(request)
        if (!safeEqual(body.token || '', config.authToken)) {
          loginLimiter.recordFailure(clientKey)
          throw new EditorHttpError(401, '访问口令无效')
        }
        loginLimiter.clear(clientKey)
        const newSessionId = sessions.create()
        const cookie = [
          `${SESSION_COOKIE}=${encodeURIComponent(newSessionId)}`,
          'HttpOnly',
          'SameSite=Strict',
          'Path=/',
          `Max-Age=${Math.floor(config.sessionTtlMs / 1000)}`,
          ...(config.secureCookie ? ['Secure'] : []),
        ].join('; ')
        sendJson(response, 200, { authenticated: true }, { 'Set-Cookie': cookie })
        return
      }
      if (request.method === 'DELETE' && url.pathname === '/api/session') {
        sessions.delete(sessionId)
        sendEmpty(
          response,
          204,
          { 'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` }
        )
        return
      }

      if (url.pathname.startsWith('/api/') && !authenticated) {
        throw new EditorHttpError(401, 'Authentication required')
      }
      const publishProtectedMutation =
        (request.method === 'PUT' && url.pathname === '/api/document') ||
        (request.method === 'POST' && [
          '/api/document/locale', '/api/build', '/api/media/upload', '/api/workspace/revert',
          '/api/workspace/commit', '/api/workspace/push',
        ].includes(url.pathname))
      if (publishProtectedMutation && publishCoordinator.isRunning?.()) {
        throw new PublishOperationError(409, 'PUBLISH_IN_PROGRESS', 'Kooboo 发布正在执行，请等待线上验收完成后再修改文档。')
      }
      if (request.method === 'GET' && url.pathname === '/api/config') {
        sendJson(response, 200, {
          mode: 'draft',
          allowedDocumentPattern: 'docs/**/*.md',
          maximumDocumentBytes: config.maximumDocumentBytes,
          maximumMediaBytes: config.maximumMediaBytes,
          fastPreviewBaseUrl: config.fastPreviewBaseUrl,
          stablePreviewBaseUrl: config.stablePreviewBaseUrl,
          productionPublishAvailable: publishCoordinator.available,
          productionPublishTarget: publishCoordinator.targetUrl,
        })
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/document') {
        sendJson(response, 200, await readDocument(config.projectRoot, url.searchParams.get('path')))
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/document/locales') {
        sendJson(response, 200, await getDocumentLocales(config.projectRoot, url.searchParams.get('path')))
        return
      }
      if (request.method === 'POST' && url.pathname === '/api/document/locale') {
        const body = await readJsonBody(request)
        const workspace = await workspaceCoordinator.getStatus()
        if (workspace.pendingPush) {
          throw new WorkspaceOperationError(409, 'PENDING_PUSH_EXISTS', '已有一个版本等待推送，请先在“改动与发布”中重试推送。')
        }
        try {
          const document = await withPreviewLock(
            { lockFile: config.lockFile, timeoutMs: config.lockTimeoutMs },
            () => createLocaleDocument(config.projectRoot, body.path, body.locale, config.draftStateFile)
          )
          sendJson(response, 201, document)
        } catch (error) {
          if (error instanceof EditorHttpError) {
            sendJson(response, error.statusCode, { error: error.message })
            return
          }
          throw error
        }
        return
      }
      if (request.method === 'PUT' && url.pathname === '/api/document') {
        const body = await readJsonBody(request)
        try {
          const workspace = await workspaceCoordinator.getStatus()
          if (workspace.pendingPush) {
            throw new WorkspaceOperationError(409, 'PENDING_PUSH_EXISTS', '已有一个版本等待推送，请先在“改动与发布”中重试推送。')
          }
          const result = await draftCoordinator.save({
            actor: request.socket.remoteAddress || 'unknown',
            documentPath: body.path,
            content: body.content,
            expectedHash: body.expectedHash,
          })
          sendJson(response, 200, result)
        } catch (error) {
          if (error instanceof DocumentConflictError) {
            sendJson(response, 409, {
              code: 'DOCUMENT_CONFLICT',
              error: '文档已被其他修改更新，请重新加载服务器版本后再编辑。',
              document: error.currentDocument,
            })
            return
          }
          if (error instanceof DocumentValidationError) {
            sendJson(response, error.statusCode, { error: error.message })
            return
          }
          throw error
        }
        return
      }
      if (request.method === 'POST' && url.pathname === '/api/build') {
        const body = await readJsonBody(request)
        try {
          sendJson(response, 202, await draftCoordinator.build({
            actor: request.socket.remoteAddress || 'unknown',
            documentPath: body.path,
          }))
        } catch (error) {
          if (error instanceof DocumentValidationError) {
            sendJson(response, error.statusCode, { error: error.message })
            return
          }
          throw error
        }
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/build-status') {
        sendJson(response, 200, draftCoordinator.getStatus())
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/workspace') {
        sendJson(response, 200, await workspaceCoordinator.getStatus())
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/media') {
        sendJson(response, 200, await mediaCoordinator.list({
          root: url.searchParams.get('root') || '',
          search: url.searchParams.get('search') || '',
          page: Number.parseInt(url.searchParams.get('page') || '1', 10),
          pageSize: Number.parseInt(url.searchParams.get('pageSize') || '48', 10),
        }))
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/media/content') {
        const media = await mediaCoordinator.content(url.searchParams.get('path'))
        response.writeHead(200, {
          ...securityHeaders(media.contentType),
          'Cache-Control': 'private, max-age=60',
          'Content-Length': media.body.length,
        })
        response.end(request.method === 'HEAD' ? undefined : media.body)
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/media/references') {
        sendJson(response, 200, await mediaCoordinator.references(url.searchParams.get('path')))
        return
      }
      if (request.method === 'POST' && url.pathname === '/api/media/upload') {
        const workspace = await workspaceCoordinator.getStatus()
        if (workspace.pendingPush) {
          throw new WorkspaceOperationError(409, 'PENDING_PUSH_EXISTS', '已有一个版本等待推送，请先在“改动与发布”中重试推送。')
        }
        const body = await readJsonBody(request)
        sendJson(response, 201, await mediaCoordinator.upload({
          actor: request.socket.remoteAddress || 'unknown',
          directory: body.directory,
          fileName: body.fileName,
          contentBase64: body.contentBase64,
        }))
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/workspace/diff') {
        sendJson(response, 200, await workspaceCoordinator.getDiff(url.searchParams.get('path')))
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/workspace/commits') {
        sendJson(response, 200, { commits: await workspaceCoordinator.getRecentCommits(url.searchParams.get('limit')) })
        return
      }
      if (request.method === 'POST' && url.pathname === '/api/workspace/revert') {
        const body = await readJsonBody(request)
        sendJson(response, 200, await workspaceCoordinator.revert({
          actor: request.socket.remoteAddress || 'unknown',
          paths: body.paths,
          expectedFingerprint: body.expectedFingerprint,
        }))
        return
      }
      if (request.method === 'POST' && url.pathname === '/api/workspace/commit') {
        const body = await readJsonBody(request)
        sendJson(response, 201, await workspaceCoordinator.commit({
          actor: request.socket.remoteAddress || 'unknown',
          message: body.message,
          expectedFingerprint: body.expectedFingerprint,
        }))
        return
      }
      if (request.method === 'POST' && url.pathname === '/api/workspace/push') {
        sendJson(response, 200, await workspaceCoordinator.retryPush({ actor: request.socket.remoteAddress || 'unknown' }))
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/publish-status') {
        sendJson(response, 200, publicPublishStatus(await publishCoordinator.getStatus()))
        return
      }
      if (request.method === 'POST' && url.pathname === '/api/publish') {
        const body = await readJsonBody(request)
        const workspace = await workspaceCoordinator.getStatus()
        if (workspace.changedFiles || workspace.pendingPush || workspace.stagedFiles || workspace.outOfScopeFiles) {
          throw new PublishOperationError(409, 'PUBLISH_WORKSPACE_NOT_READY', '请先提交并推送全部改动，再发布到 Kooboo。')
        }
        if (workspace.head !== body.expectedCommit) {
          throw new PublishOperationError(409, 'PUBLISH_HEAD_CHANGED', '服务器版本已经变化，请刷新后重新发布。', { head: workspace.head })
        }
        sendJson(response, 202, publicPublishStatus(await publishCoordinator.start({
          actor: request.socket.remoteAddress || 'unknown',
          expectedCommit: body.expectedCommit,
          applyDeletes: body.applyDeletes === true,
        })))
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/preview-status') {
        sendJson(response, 200, await resolvePreviewStatus(config))
        return
      }
      if (url.pathname.startsWith('/api/')) throw new EditorHttpError(404, 'API route not found')
      if (!['GET', 'HEAD'].includes(request.method || '')) {
        throw new EditorHttpError(405, 'Method not allowed')
      }

      await sendStaticFile(config, request, url.pathname, response)
    } catch (error) {
      const statusCode = error instanceof EditorHttpError || error instanceof WorkspaceOperationError || error instanceof MediaOperationError || error instanceof PublishOperationError ? error.statusCode : 500
      const message =
        error instanceof EditorHttpError || error instanceof WorkspaceOperationError || error instanceof MediaOperationError || error instanceof PublishOperationError
          ? error.message
          : 'Internal editor server error'
      if (statusCode >= 500) console.error(error)
      if (!response.headersSent) sendJson(response, statusCode, {
        error: message,
        ...(error instanceof WorkspaceOperationError ? { code: error.code, ...error.details } : {}),
        ...(error instanceof MediaOperationError ? { code: error.code } : {}),
        ...(error instanceof PublishOperationError ? { code: error.code, ...error.details } : {}),
      })
      else response.destroy()
    }
  })
}

export async function listenDocsEditorServer(input = {}) {
  const config = await normalizeConfig(input)
  const server = await createDocsEditorServer(config)
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(config.port, config.host, resolve)
  })
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : config.port
  return {
    server,
    url: `http://${config.host}:${port}`,
    async close() {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    },
  }
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  listenDocsEditorServer()
    .then(({ url }) => {
      console.log(`Documentation editor: ${url}/`)
      console.log(`Health endpoint: ${url}/api/health`)
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exit(1)
    })
}
