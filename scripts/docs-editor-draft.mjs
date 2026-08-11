import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { appendFile, mkdir, open, readFile, realpath, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { withPreviewLock } from './run-with-preview-lock.mjs'

export const DEFAULT_MAX_DOCUMENT_BYTES = 2 * 1024 * 1024
const MAX_BUILD_OUTPUT_BYTES = 256 * 1024
const MAX_BUILD_ERROR_CHARS = 8_000

class BuildSupersededError extends Error {
  constructor() {
    super('Stable preview build was superseded by a newer save')
    this.name = 'BuildSupersededError'
  }
}

export class DocumentConflictError extends Error {
  constructor(currentDocument) {
    super('Document changed after it was opened')
    this.name = 'DocumentConflictError'
    this.currentDocument = currentDocument
  }
}

export class DocumentValidationError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.name = 'DocumentValidationError'
    this.statusCode = statusCode
  }
}

function hashContent(content) {
  return createHash('sha256').update(content).digest('hex')
}

function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function assertContent(content, maximumBytes) {
  if (typeof content !== 'string') throw new DocumentValidationError(400, 'Document content must be a string')
  if (content.includes('\0')) throw new DocumentValidationError(400, 'Document content must not contain NUL bytes')
  const bytes = Buffer.byteLength(content)
  if (bytes > maximumBytes) {
    throw new DocumentValidationError(413, `Document content exceeds the ${maximumBytes} byte limit`)
  }
  return bytes
}

async function syncDirectory(directory) {
  let handle
  try {
    handle = await open(directory, 'r')
    await handle.sync()
  } finally {
    await handle?.close()
  }
}

export async function writeDocumentAtomically({
  projectRoot,
  documentPath,
  content,
  expectedHash,
  maximumBytes = DEFAULT_MAX_DOCUMENT_BYTES,
}) {
  if (!/^[a-f0-9]{64}$/u.test(String(expectedHash || ''))) {
    throw new DocumentValidationError(400, 'Expected document hash must be a SHA-256 value')
  }
  const bytes = assertContent(content, maximumBytes)
  const normalizedRoot = await realpath(path.resolve(projectRoot))
  const docsRoot = await realpath(path.join(normalizedRoot, 'docs'))
  const requestedFile = path.resolve(normalizedRoot, documentPath)
  if (!isPathInside(docsRoot, requestedFile)) {
    throw new DocumentValidationError(400, 'Document path escapes the docs directory')
  }

  let filePath
  try {
    filePath = await realpath(requestedFile)
  } catch (error) {
    if (error?.code === 'ENOENT') throw new DocumentValidationError(404, 'Document does not exist')
    throw error
  }
  if (!isPathInside(docsRoot, filePath)) {
    throw new DocumentValidationError(400, 'Document path escapes the docs directory')
  }

  const metadata = await stat(filePath)
  if (!metadata.isFile()) throw new DocumentValidationError(404, 'Document does not exist')
  const currentContent = await readFile(filePath, 'utf8')
  const currentHash = hashContent(currentContent)
  if (currentHash !== expectedHash) {
    throw new DocumentConflictError({
      path: documentPath,
      content: currentContent,
      hash: currentHash,
      bytes: Buffer.byteLength(currentContent),
      modifiedAt: metadata.mtime.toISOString(),
    })
  }

  const temporaryFile = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`
  )
  let handle
  try {
    handle = await open(temporaryFile, 'wx', metadata.mode & 0o777)
    await handle.writeFile(content, 'utf8')
    await handle.sync()
    await handle.close()
    handle = undefined
    await rename(temporaryFile, filePath)
    await syncDirectory(path.dirname(filePath))
  } catch (error) {
    await handle?.close().catch(() => undefined)
    await rm(temporaryFile, { force: true })
    throw error
  }

  const savedMetadata = await stat(filePath)
  return {
    path: documentPath,
    content,
    hash: hashContent(content),
    bytes,
    modifiedAt: savedMetadata.mtime.toISOString(),
  }
}

async function writeJsonAtomically(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true })
  const temporaryFile = `${filePath}.${process.pid}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryFile, `${JSON.stringify(payload, null, 2)}\n`, { encoding: 'utf8', mode: 0o640 })
    await rename(temporaryFile, filePath)
  } catch (error) {
    await rm(temporaryFile, { force: true })
    throw error
  }
}

async function runCommand(command, args, cwd, { signal: abortSignal } = {}) {
  if (abortSignal?.aborted) throw new BuildSupersededError()
  const detached = process.platform !== 'win32'
  const child = spawn(command, args, {
    cwd,
    detached,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let captured = Buffer.alloc(0)
  let forceKillTimer
  const terminate = () => {
    try {
      if (detached && child.pid) process.kill(-child.pid, 'SIGTERM')
      else child.kill('SIGTERM')
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error
    }
    forceKillTimer = setTimeout(() => {
      try {
        if (detached && child.pid) process.kill(-child.pid, 'SIGKILL')
        else child.kill('SIGKILL')
      } catch (error) {
        if (error?.code !== 'ESRCH') console.error(error)
      }
    }, 2_000)
    forceKillTimer.unref?.()
  }
  const capture = (chunk) => {
    captured = Buffer.concat([captured, chunk])
    if (captured.length > MAX_BUILD_OUTPUT_BYTES) {
      captured = captured.subarray(captured.length - MAX_BUILD_OUTPUT_BYTES)
    }
  }
  child.stdout.on('data', capture)
  child.stderr.on('data', capture)
  if (abortSignal?.aborted) terminate()
  else abortSignal?.addEventListener('abort', terminate, { once: true })
  return new Promise((resolve, reject) => {
    let settled = false
    const cleanup = () => {
      clearTimeout(forceKillTimer)
      abortSignal?.removeEventListener?.('abort', terminate)
      child.off('error', onError)
      child.off('close', onClose)
    }
    const settle = (callback) => {
      if (settled) return
      settled = true
      cleanup()
      callback()
    }
    const onError = (error) => settle(() => reject(error))
    const onClose = (code, processSignal) => settle(() => {
      const output = captured.toString('utf8').trim()
      if (abortSignal?.aborted) reject(new BuildSupersededError())
      else if (code === 0) resolve({ output })
      else {
        const suffix = output.slice(-MAX_BUILD_ERROR_CHARS)
        const reason = processSignal ? `terminated by ${processSignal}` : `exited with code ${code}`
        reject(new Error(`${command} ${reason}${suffix ? `\n${suffix}` : ''}`))
      }
    })
    child.once('error', onError)
    child.once('close', onClose)
  })
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

async function updateDraftMarker({ projectRoot, draftStateFile, document, savedAt }) {
  const result = await runCommand('git', ['status', '--porcelain', '--untracked-files=normal', '--', 'docs'], projectRoot)
  if (!result.output.trim()) {
    await unlink(draftStateFile).catch((error) => {
      if (error?.code !== 'ENOENT') throw error
    })
    return { active: false }
  }
  const state = {
    schemaVersion: 1,
    active: true,
    updatedAt: savedAt,
    lastDocument: document.path,
    lastHash: document.hash,
  }
  await writeJsonAtomically(draftStateFile, state)
  return state
}

async function appendAudit(auditLog, event) {
  await mkdir(path.dirname(auditLog), { recursive: true })
  await appendFile(auditLog, `${JSON.stringify({ schemaVersion: 1, ...event })}\n`, { encoding: 'utf8', mode: 0o640 })
}

async function appendBackgroundAudit(auditLog, event) {
  try {
    await appendAudit(auditLog, event)
  } catch (error) {
    console.error('Unable to append documentation editor build audit event', error)
  }
}

function publicError(error) {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(-MAX_BUILD_ERROR_CHARS)
}

export function createDraftCoordinator({
  projectRoot,
  previewRoot,
  previewEnvFile,
  draftStateFile = path.join(previewRoot, '.editor-draft.json'),
  auditLog = path.join(previewRoot, 'editor-audit.jsonl'),
  lockFile = path.join(previewRoot, '.update.lock'),
  lockTimeoutMs = 180_000,
  maximumBytes = DEFAULT_MAX_DOCUMENT_BYTES,
  buildDebounceMs = 8_000,
  buildCommand,
  readDocument,
  normalizeDocumentPath,
}) {
  let saveTail = Promise.resolve()
  let saveQueued = 0
  let sequence = 0
  let pendingBuild = null
  let buildTimer = null
  let buildPromise = null
  let activeBuildController = null
  const idleWaiters = new Set()
  const status = {
    status: 'idle',
    operationId: null,
    path: null,
    savedAt: null,
    finishedAt: null,
    releaseId: null,
    error: null,
  }

  const queuedCount = () => saveQueued + (pendingBuild ? 1 : 0)
  const snapshot = () => ({ ...status, queued: queuedCount() })
  const setStatus = (next, extra = {}) => Object.assign(status, { status: next, ...extra })

  function isIdle() {
    return saveQueued === 0 && !pendingBuild && !buildTimer && !buildPromise
  }

  function notifyIdle() {
    if (!isIdle()) return
    for (const resolve of idleWaiters) resolve()
    idleWaiters.clear()
  }

  function createBuildCommand(paths) {
    return buildCommand || {
      command: '/bin/bash',
      args: [
        path.join(projectRoot, 'deploy', 'preview', 'update.sh'),
        '--app-dir', projectRoot,
        '--env-file', previewEnvFile,
        '--reason', `editor draft ${paths.join(', ')}`,
        '--skip-lock',
      ],
    }
  }

  async function performBuild(job) {
    const controller = new AbortController()
    activeBuildController = controller
    setStatus('building', {
      operationId: job.operationId,
      path: job.paths.at(-1) || null,
      error: null,
      finishedAt: null,
    })
    try {
      if (controller.signal.aborted) throw new BuildSupersededError()
      return await withPreviewLock({ lockFile, timeoutMs: lockTimeoutMs }, async () => {
        if (controller.signal.aborted) throw new BuildSupersededError()
        const command = createBuildCommand(job.paths)
        await runCommand(command.command, command.args, projectRoot, { signal: controller.signal })
        const previewStatus = await readJson(path.join(previewRoot, '.preview-status.json'))
        const finishedAt = new Date().toISOString()
        setStatus('ready', { finishedAt, releaseId: previewStatus?.releaseId || null, error: null })
        await appendBackgroundAudit(auditLog, {
          at: finishedAt,
          actor: job.actor,
          operationId: job.operationId,
          paths: job.paths,
          releaseId: status.releaseId,
          outcome: 'preview_ready',
        })
      })
    } catch (error) {
      const finishedAt = new Date().toISOString()
      if (error instanceof BuildSupersededError) {
        await appendBackgroundAudit(auditLog, {
          at: finishedAt,
          actor: job.actor,
          operationId: job.operationId,
          paths: job.paths,
          outcome: 'preview_superseded',
        })
        return
      }
      const errorSummary = publicError(error)
      setStatus('error', { finishedAt, error: errorSummary })
      await appendBackgroundAudit(auditLog, {
        at: finishedAt,
        actor: job.actor,
        operationId: job.operationId,
        paths: job.paths,
        error: errorSummary,
        outcome: 'preview_error',
      })
    } finally {
      if (activeBuildController === controller) activeBuildController = null
    }
  }

  function startBuild() {
    buildTimer = null
    if (buildPromise || !pendingBuild) return
    const job = pendingBuild
    pendingBuild = null
    buildPromise = performBuild(job).finally(() => {
      buildPromise = null
      if (pendingBuild) scheduleBuildTimer()
      else notifyIdle()
    })
  }

  function scheduleBuildTimer() {
    if (buildPromise || !pendingBuild) return
    clearTimeout(buildTimer)
    setStatus('queued', {
      operationId: pendingBuild.operationId,
      path: pendingBuild.paths.at(-1) || null,
      error: null,
      finishedAt: null,
    })
    buildTimer = setTimeout(startBuild, buildDebounceMs)
  }

  function scheduleBuild({ actor, operationId, path: documentPath }) {
    if (pendingBuild) {
      pendingBuild.actor = actor
      pendingBuild.operationId = operationId
      if (!pendingBuild.paths.includes(documentPath)) pendingBuild.paths.push(documentPath)
    } else {
      pendingBuild = { actor, operationId, paths: [documentPath] }
    }
    if (!buildPromise) scheduleBuildTimer()
  }

  async function performSave({ documentPath, content, expectedHash, actor }) {
    const operationId = `${Date.now()}-${++sequence}`
    let normalizedPath
    try {
      normalizedPath = normalizeDocumentPath(documentPath)
    } catch (error) {
      await appendAudit(auditLog, {
        at: new Date().toISOString(),
        actor,
        operationId,
        path: String(documentPath || '').slice(0, 512),
        error: publicError(error),
        outcome: 'rejected',
      })
      throw error
    }
    return withPreviewLock({ lockFile, timeoutMs: lockTimeoutMs }, async () => {
      setStatus('saving', { operationId, path: normalizedPath, error: null, finishedAt: null })
      let document
      try {
        document = await writeDocumentAtomically({
          projectRoot,
          documentPath: normalizedPath,
          content,
          expectedHash,
          maximumBytes,
        })
      } catch (error) {
        if (error instanceof DocumentConflictError) {
          setStatus('conflict', { finishedAt: new Date().toISOString(), error: error.message })
          await appendAudit(auditLog, {
            at: new Date().toISOString(), actor, operationId, path: normalizedPath, outcome: 'conflict',
          })
        } else {
          setStatus('error', { finishedAt: new Date().toISOString(), error: publicError(error) })
          await appendAudit(auditLog, {
            at: new Date().toISOString(),
            actor,
            operationId,
            path: normalizedPath,
            error: publicError(error),
            outcome: 'save_error',
          })
        }
        throw error
      }

      const savedAt = new Date().toISOString()
      status.savedAt = savedAt
      await updateDraftMarker({ projectRoot, draftStateFile, document, savedAt })
      await appendAudit(auditLog, {
        at: savedAt, actor, operationId, path: normalizedPath, hash: document.hash, bytes: document.bytes, outcome: 'saved',
      })
      scheduleBuild({ actor, operationId, path: normalizedPath })
      return {
        document,
        build: {
          status: 'queued',
          operationId,
          scheduledAt: savedAt,
          debounceMs: buildDebounceMs,
        },
      }
    })
  }

  return {
    getStatus: snapshot,
    save(input) {
      activeBuildController?.abort()
      saveQueued += 1
      const task = saveTail.then(() => performSave(input))
      saveTail = task.catch(() => undefined).finally(() => {
        saveQueued -= 1
        notifyIdle()
      })
      return task
    },
    waitForIdle() {
      if (isIdle()) return Promise.resolve()
      return new Promise((resolve) => idleWaiters.add(resolve))
    },
    async readCurrent(documentPath) {
      return readDocument(projectRoot, documentPath)
    },
  }
}
