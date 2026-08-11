import { execFile, spawn } from 'node:child_process'
import { createReadStream, watch as watchFileSystem } from 'node:fs'
import {
  access,
  cp,
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  symlink,
  writeFile
} from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const projectRoot = path.resolve(__dirname, '..')
export const vitePressDistDir = path.join(projectRoot, 'docs', '.vitepress', 'dist')

const contentTypes = new Map([
  ['.avif', 'image/avif'],
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8']
])

function readArg(argv, name) {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

function readPositiveInteger(value, fallback, name) {
  if (value === undefined) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return parsed
}

function safeReleaseId(value) {
  if (!/^[A-Za-z0-9._-]+$/u.test(value)) {
    throw new Error(`Invalid preview release id: ${value}`)
  }
  return value
}

async function pathExists(targetPath) {
  try {
    await access(targetPath)
    return true
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return false
    throw error
  }
}

export async function readCurrentReleasePath(previewRoot) {
  try {
    return await realpath(path.join(previewRoot, 'current'))
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return null
    throw error
  }
}

export async function writePreviewStatus(previewRoot, statusValue) {
  await mkdir(previewRoot, { recursive: true })
  const statusPath = path.join(previewRoot, '.preview-status.json')
  const temporaryStatusPath = path.join(
    previewRoot,
    `.preview-status-${process.pid}-${Date.now()}.tmp`
  )
  try {
    await writeFile(temporaryStatusPath, `${JSON.stringify(statusValue, null, 2)}\n`, 'utf-8')
    await rename(temporaryStatusPath, statusPath)
  } catch (error) {
    await rm(temporaryStatusPath, { force: true })
    throw error
  }
}

export async function readPreviewStatus(previewRoot, fallbackStatus = {}) {
  let persistedStatus = {}
  try {
    persistedStatus = JSON.parse(
      await readFile(path.join(previewRoot, '.preview-status.json'), 'utf-8')
    )
  } catch (error) {
    if (!(error && typeof error === 'object' && error.code === 'ENOENT')) {
      persistedStatus = {
        error: `Invalid preview status: ${error instanceof Error ? error.message : error}`,
        status: 'error'
      }
    }
  }

  let releaseMetadata = {}
  const currentReleasePath = await readCurrentReleasePath(previewRoot)
  if (currentReleasePath) {
    try {
      const metadata = JSON.parse(
        await readFile(path.join(currentReleasePath, '.preview-meta.json'), 'utf-8')
      )
      releaseMetadata = {
        lastSuccessAt: metadata.publishedAt || null,
        releaseId: metadata.releaseId || path.basename(currentReleasePath),
        sourceCommit: metadata.sourceCommit || null,
        sourceDirty: metadata.sourceDirty ?? null
      }
    } catch {
      releaseMetadata = { releaseId: path.basename(currentReleasePath) }
    }
  }

  return { ...fallbackStatus, ...persistedStatus, ...releaseMetadata }
}

async function cleanupOldReleases({ previewRoot, keepReleases }) {
  const releasesDir = path.join(previewRoot, 'releases')
  const currentPath = await readCurrentReleasePath(previewRoot)
  const entries = await readdir(releasesDir, { withFileTypes: true })
  const releases = []

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.tmp-')) continue
    const releasePath = path.join(releasesDir, entry.name)
    const releaseStat = await stat(releasePath)
    releases.push({ releasePath, modifiedAt: releaseStat.mtimeMs })
  }

  releases.sort((left, right) => right.modifiedAt - left.modifiedAt)
  const removable = releases
    .filter((entry) => path.resolve(entry.releasePath) !== path.resolve(currentPath || ''))
    .slice(Math.max(0, keepReleases - 1))

  await Promise.all(
    removable.map((entry) => rm(entry.releasePath, { recursive: true, force: true }))
  )
}

export async function publishPreviewRelease({
  distDir,
  previewRoot,
  releaseId,
  metadata,
  keepReleases = 5
}) {
  const normalizedReleaseId = safeReleaseId(releaseId)
  await access(path.join(distDir, 'index.html'))

  const releasesDir = path.join(previewRoot, 'releases')
  const releaseDir = path.join(releasesDir, normalizedReleaseId)
  const temporaryReleaseDir = path.join(
    releasesDir,
    `.tmp-${normalizedReleaseId}-${process.pid}-${Date.now()}`
  )
  const temporaryLink = path.join(
    previewRoot,
    `.current-${process.pid}-${Date.now()}`
  )

  await mkdir(releasesDir, { recursive: true })

  if (await pathExists(releaseDir)) {
    throw new Error(`Preview release already exists: ${releaseDir}`)
  }

  try {
    await cp(distDir, temporaryReleaseDir, { recursive: true, force: true })
    await writeFile(
      path.join(temporaryReleaseDir, '.preview-meta.json'),
      `${JSON.stringify(metadata, null, 2)}\n`,
      'utf-8'
    )
    await rename(temporaryReleaseDir, releaseDir)

    const relativeReleasePath = path.relative(previewRoot, releaseDir)
    await symlink(relativeReleasePath, temporaryLink, 'dir')
    await rename(temporaryLink, path.join(previewRoot, 'current'))
  } catch (error) {
    await rm(temporaryReleaseDir, { recursive: true, force: true })
    await rm(temporaryLink, { force: true })
    throw error
  }

  await cleanupOldReleases({ previewRoot, keepReleases })
  return { releaseDir, releaseId: normalizedReleaseId }
}

function isPathInside(rootDir, candidatePath) {
  const relative = path.relative(rootDir, candidatePath)
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}

export async function resolvePreviewFile(releaseRoot, requestPathname) {
  let decodedPath
  try {
    decodedPath = decodeURIComponent(requestPathname)
  } catch {
    return { statusCode: 400, filePath: null }
  }

  if (decodedPath.includes('\0') || decodedPath.includes('\\')) {
    return { statusCode: 400, filePath: null }
  }

  const relativePath = decodedPath.replace(/^\/+/, '')
  const requestedPath = path.resolve(releaseRoot, relativePath || 'index.html')
  if (!isPathInside(releaseRoot, requestedPath) && requestedPath !== path.resolve(releaseRoot)) {
    return { statusCode: 403, filePath: null }
  }

  const candidates = []
  if (!relativePath) {
    candidates.push(path.join(releaseRoot, 'index.html'))
  } else {
    candidates.push(requestedPath)
    if (decodedPath.endsWith('/')) {
      candidates.push(path.join(requestedPath, 'index.html'))
    } else if (!path.extname(relativePath)) {
      candidates.push(`${requestedPath}.html`, path.join(requestedPath, 'index.html'))
    }
  }

  for (const candidate of candidates) {
    if (!isPathInside(releaseRoot, candidate)) continue
    try {
      const candidateStat = await stat(candidate)
      if (candidateStat.isFile()) return { statusCode: 200, filePath: candidate }
    } catch (error) {
      if (!(error && typeof error === 'object' && error.code === 'ENOENT')) throw error
    }
  }

  const notFoundPage = path.join(releaseRoot, '404.html')
  if (await pathExists(notFoundPage)) return { statusCode: 404, filePath: notFoundPage }
  return { statusCode: 404, filePath: null }
}

function writeJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow'
  })
  response.end(`${JSON.stringify(value, null, 2)}\n`)
}

function writeText(response, statusCode, value) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow'
  })
  response.end(value)
}

async function serveFile(request, response, filePath, statusCode) {
  const extension = path.extname(filePath).toLowerCase()
  const cacheControl = extension === '.html' ? 'no-store' : 'public, max-age=300'
  const fileStat = await stat(filePath)
  response.writeHead(statusCode, {
    'Cache-Control': cacheControl,
    'Content-Length': fileStat.size,
    'Content-Type': contentTypes.get(extension) || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow'
  })
  if (request.method === 'HEAD') {
    response.end()
    return
  }
  createReadStream(filePath).pipe(response)
}

export function createPreviewHttpServer({ previewRoot, state }) {
  return http.createServer(async (request, response) => {
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.setHeader('Allow', 'GET, HEAD')
        writeText(response, 405, 'Method Not Allowed\n')
        return
      }

      const requestUrl = new URL(request.url || '/', 'http://preview.local')
      if (requestUrl.pathname === '/__preview/status') {
        const currentStatus = await readPreviewStatus(previewRoot, state)
        Object.assign(state, currentStatus)
        writeJson(response, 200, currentStatus)
        return
      }

      const releaseRoot = await readCurrentReleasePath(previewRoot)
      if (!releaseRoot) {
        writeText(response, 503, 'Preview is not ready yet.\n')
        return
      }

      const resolved = await resolvePreviewFile(releaseRoot, requestUrl.pathname)
      if (!resolved.filePath) {
        writeText(response, resolved.statusCode, `${http.STATUS_CODES[resolved.statusCode]}\n`)
        return
      }
      await serveFile(request, response, resolved.filePath, resolved.statusCode)
    } catch (error) {
      writeText(
        response,
        500,
        `${error instanceof Error ? error.message : 'Internal Server Error'}\n`
      )
    }
  })
}

async function runCommand(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })

  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

async function readSourceVersion() {
  let commit = 'unknown'
  let dirty = null
  try {
    const [{ stdout: commitOutput }, { stdout: statusOutput }] = await Promise.all([
      execFileAsync('git', ['rev-parse', '--short', 'HEAD'], { cwd: projectRoot }),
      execFileAsync('git', ['status', '--porcelain'], { cwd: projectRoot })
    ])
    commit = commitOutput.trim() || 'unknown'
    dirty = Boolean(statusOutput.trim())
  } catch {
    // Previewing exported source without Git metadata is supported.
  }
  return { commit, dirty }
}

function createReleaseId({ commit, buildNumber, now = new Date() }) {
  const timestamp = now.toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, 'Z')
  return `${timestamp}-${commit}-${buildNumber}`
}

export function createBuildCoordinator({ previewRoot, state, keepReleases, buildCommand }) {
  let runningPromise = null
  let pendingReason = null
  let stopped = false

  async function performBuild(reason) {
    state.status = 'building'
    state.buildNumber += 1
    state.buildReason = reason
    state.buildStartedAt = new Date().toISOString()
    state.buildFinishedAt = null
    state.error = null
    await writePreviewStatus(previewRoot, state)

    try {
      await runCommand(buildCommand.command, buildCommand.args, projectRoot)
      const source = await readSourceVersion()
      const releaseId = createReleaseId({
        commit: source.commit,
        buildNumber: state.buildNumber
      })
      const publishedAt = new Date().toISOString()
      await publishPreviewRelease({
        distDir: vitePressDistDir,
        previewRoot,
        releaseId,
        keepReleases,
        metadata: {
          schemaVersion: 1,
          releaseId,
          publishedAt,
          sourceCommit: source.commit,
          sourceDirty: source.dirty,
          buildReason: reason
        }
      })
      state.status = 'ready'
      state.releaseId = releaseId
      state.sourceCommit = source.commit
      state.sourceDirty = source.dirty
      state.lastSuccessAt = publishedAt
      state.error = null
      console.log(`Preview release ready: ${releaseId}`)
    } catch (error) {
      if (stopped) {
        state.status = state.releaseId ? 'ready' : 'error'
        state.error = null
      } else {
        state.status = state.releaseId ? 'degraded' : 'error'
        state.error = error instanceof Error ? error.message : String(error)
        state.lastFailureAt = new Date().toISOString()
        console.error(`Preview build failed: ${state.error}`)
      }
    } finally {
      state.buildFinishedAt = new Date().toISOString()
      await writePreviewStatus(previewRoot, state)
    }
  }

  async function drainBuildQueue(reason) {
    let currentReason = reason
    do {
      pendingReason = null
      await performBuild(currentReason)
      currentReason = pendingReason
    } while (currentReason && !stopped)
  }

  return {
    requestBuild(reason) {
      if (stopped) return Promise.resolve()
      if (runningPromise) {
        pendingReason = reason
        return runningPromise
      }
      runningPromise = drainBuildQueue(reason).finally(() => {
        runningPromise = null
      })
      return runningPromise
    },
    waitForIdle() {
      return runningPromise || Promise.resolve()
    },
    stop() {
      stopped = true
      pendingReason = null
    }
  }
}

export function shouldIgnoreWatchPath(fileName) {
  if (!fileName) return false
  const normalized = fileName.replace(/\\/gu, '/')
  return (
    /^\.vitepress\/config\.mts\.timestamp-.+\.mjs$/u.test(normalized) ||
    normalized === '.vitepress/dist' ||
    normalized.startsWith('.vitepress/dist/') ||
    normalized === '.vitepress/cache' ||
    normalized.startsWith('.vitepress/cache/') ||
    normalized === '.vitepress/.temp' ||
    normalized.startsWith('.vitepress/.temp/')
  )
}

function watchDocumentation({ coordinator, debounceMs }) {
  const docsDir = path.join(projectRoot, 'docs')
  let debounceTimer = null
  const watcher = watchFileSystem(docsDir, { recursive: true }, (_eventType, fileName) => {
    if (shouldIgnoreWatchPath(fileName)) return
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      coordinator
        .requestBuild(`docs change: ${fileName || 'unknown'}`)
        .catch((error) =>
          console.error(
            `Preview build coordinator failed: ${error instanceof Error ? error.message : error}`
          )
        )
    }, debounceMs)
  })

  watcher.on('error', (error) => {
    console.error(`Preview watcher failed: ${error.message}`)
  })
  return () => {
    clearTimeout(debounceTimer)
    watcher.close()
  }
}

async function listen(server, { host, port }) {
  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening)
      reject(error)
    }
    const onListening = () => {
      server.off('error', onError)
      resolve()
    }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, host)
  })
}

async function main() {
  const argv = process.argv.slice(2)
  const host = readArg(argv, '--host') || process.env.DOCS_PREVIEW_HOST || '127.0.0.1'
  const port = readPositiveInteger(
    readArg(argv, '--port') || process.env.DOCS_PREVIEW_PORT,
    4173,
    'preview port'
  )
  const keepReleases = readPositiveInteger(
    process.env.DOCS_PREVIEW_KEEP_RELEASES,
    5,
    'DOCS_PREVIEW_KEEP_RELEASES'
  )
  const debounceMs = readPositiveInteger(
    process.env.DOCS_PREVIEW_DEBOUNCE_MS,
    800,
    'DOCS_PREVIEW_DEBOUNCE_MS'
  )
  const previewRoot = path.resolve(
    readArg(argv, '--root') ||
      process.env.DOCS_PREVIEW_ROOT ||
      path.join(projectRoot, '.local-preview')
  )
  const state = {
    status: 'starting',
    buildNumber: 0,
    buildReason: null,
    buildStartedAt: null,
    buildFinishedAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    releaseId: null,
    sourceCommit: null,
    sourceDirty: null,
    error: null
  }

  await mkdir(previewRoot, { recursive: true })
  Object.assign(state, await readPreviewStatus(previewRoot, state))
  if (state.releaseId && state.status === 'starting') state.status = 'ready'

  const coordinator = createBuildCoordinator({
    previewRoot,
    state,
    keepReleases,
    buildCommand: { command: 'corepack', args: ['pnpm', 'docs:build'] }
  })
  const server = createPreviewHttpServer({ previewRoot, state })
  await listen(server, { host, port })
  console.log(`Documentation preview: http://${host}:${port}/`)
  console.log(`Status endpoint: http://${host}:${port}/__preview/status`)

  const stopWatching = argv.includes('--no-watch')
    ? () => {}
    : watchDocumentation({ coordinator, debounceMs })

  if (!argv.includes('--skip-initial-build')) {
    coordinator
      .requestBuild('initial startup')
      .catch((error) =>
        console.error(
          `Initial preview build failed: ${error instanceof Error ? error.message : error}`
        )
      )
  }

  const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}; stopping preview server...`)
    stopWatching()
    coordinator.stop()
    await coordinator.waitForIdle()
    await new Promise((resolve) => server.close(resolve))
  }

  process.once('SIGINT', () => shutdown('SIGINT').then(() => process.exit(0)))
  process.once('SIGTERM', () => shutdown('SIGTERM').then(() => process.exit(0)))
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
