import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { readFile, realpath, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultProjectRoot = path.resolve(__dirname, '..')
const SESSION_COOKIE = 'kb_docs_editor_session'
const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000
const MAX_BODY_BYTES = 4096

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

function assertHttpUrl(value, name) {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error(`${name} must be an http or https URL without credentials`)
  }
  return url.toString()
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

function securityHeaders(contentType) {
  return {
    'Content-Type': contentType,
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
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
    previewBaseUrl: assertHttpUrl(
      input.previewBaseUrl || process.env.DOCS_EDITOR_PREVIEW_PUBLIC_URL || 'http://127.0.0.1:4173',
      'preview public URL'
    ).replace(/\/$/u, ''),
    previewStatusUrl: assertHttpUrl(
      input.previewStatusUrl ||
        process.env.DOCS_EDITOR_PREVIEW_STATUS_URL ||
        'http://127.0.0.1:4173/__preview/status',
      'preview status URL'
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
    ...securityHeaders(contentTypes.get(extension) || 'application/octet-stream'),
    'Cache-Control': isIndex ? 'no-store' : 'public, max-age=31536000, immutable',
    'Content-Length': body.length,
  })
  response.end(request.method === 'HEAD' ? undefined : body)
}

export async function createDocsEditorServer(input = {}) {
  const config = await normalizeConfig(input)
  const sessions = createSessionStore(config.sessionTtlMs)
  const loginLimiter = createLoginLimiter()

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
      const sessionId = parseCookies(request.headers.cookie).get(SESSION_COOKIE)
      const authenticated = sessions.has(sessionId)

      if (request.method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, { status: 'ready', mode: 'readonly' })
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
      if (request.method === 'GET' && url.pathname === '/api/config') {
        sendJson(response, 200, {
          mode: 'readonly',
          allowedDocumentPattern: 'docs/**/*.md',
          previewBaseUrl: config.previewBaseUrl,
        })
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/document') {
        sendJson(response, 200, await readDocument(config.projectRoot, url.searchParams.get('path')))
        return
      }
      if (request.method === 'GET' && url.pathname === '/api/preview-status') {
        try {
          sendJson(response, 200, {
            available: true,
            status: await fetchPreviewStatus(config.previewStatusUrl),
          })
        } catch (error) {
          sendJson(response, 502, {
            available: false,
            error: error instanceof Error ? error.message : String(error),
          })
        }
        return
      }
      if (url.pathname.startsWith('/api/')) throw new EditorHttpError(404, 'API route not found')
      if (!['GET', 'HEAD'].includes(request.method || '')) {
        throw new EditorHttpError(405, 'Method not allowed')
      }

      await sendStaticFile(config, request, url.pathname, response)
    } catch (error) {
      const statusCode = error instanceof EditorHttpError ? error.statusCode : 500
      const message =
        error instanceof EditorHttpError
          ? error.message
          : 'Internal editor server error'
      if (statusCode >= 500) console.error(error)
      if (!response.headersSent) sendJson(response, statusCode, { error: message })
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
