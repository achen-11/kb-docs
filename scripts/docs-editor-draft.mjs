import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { appendFile, mkdir, open, readFile, realpath, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { withPreviewLock } from './run-with-preview-lock.mjs'

export const DEFAULT_MAX_DOCUMENT_BYTES = 2 * 1024 * 1024
const MAX_BUILD_OUTPUT_BYTES = 256 * 1024
const MAX_BUILD_ERROR_CHARS = 8_000

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

async function runCommand(command, args, cwd) {
  const child = spawn(command, args, { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'] })
  let captured = Buffer.alloc(0)
  const capture = (chunk) => {
    captured = Buffer.concat([captured, chunk])
    if (captured.length > MAX_BUILD_OUTPUT_BYTES) {
      captured = captured.subarray(captured.length - MAX_BUILD_OUTPUT_BYTES)
    }
  }
  child.stdout.on('data', capture)
  child.stderr.on('data', capture)
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code, signal) => {
      const output = captured.toString('utf8').trim()
      if (code === 0) resolve({ output })
      else {
        const suffix = output.slice(-MAX_BUILD_ERROR_CHARS)
        const reason = signal ? `terminated by ${signal}` : `exited with code ${code}`
        reject(new Error(`${command} ${reason}${suffix ? `\n${suffix}` : ''}`))
      }
    })
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
  buildCommand,
  readDocument,
  normalizeDocumentPath,
}) {
  let tail = Promise.resolve()
  let queued = 0
  let sequence = 0
  const status = {
    status: 'idle',
    queued: 0,
    operationId: null,
    path: null,
    savedAt: null,
    finishedAt: null,
    releaseId: null,
    error: null,
  }

  const snapshot = () => ({ ...status, queued })
  const setStatus = (next, extra = {}) => Object.assign(status, { status: next, ...extra })

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

      setStatus('building')
      const command = buildCommand || {
        command: '/bin/bash',
        args: [
          path.join(projectRoot, 'deploy', 'preview', 'update.sh'),
          '--app-dir', projectRoot,
          '--env-file', previewEnvFile,
          '--reason', `editor draft ${normalizedPath}`,
          '--skip-lock',
        ],
      }
      try {
        await runCommand(command.command, command.args, projectRoot)
        const previewStatus = await readJson(path.join(previewRoot, '.preview-status.json'))
        const finishedAt = new Date().toISOString()
        setStatus('ready', { finishedAt, releaseId: previewStatus?.releaseId || null, error: null })
        await appendAudit(auditLog, {
          at: finishedAt, actor, operationId, path: normalizedPath, releaseId: status.releaseId, outcome: 'preview_ready',
        })
        return { document, build: { status: 'ready', releaseId: status.releaseId, finishedAt } }
      } catch (error) {
        const finishedAt = new Date().toISOString()
        const errorSummary = publicError(error)
        setStatus('error', { finishedAt, error: errorSummary })
        await appendAudit(auditLog, {
          at: finishedAt, actor, operationId, path: normalizedPath, error: errorSummary, outcome: 'preview_error',
        })
        return { document, build: { status: 'error', error: errorSummary, finishedAt } }
      }
    })
  }

  return {
    getStatus: snapshot,
    save(input) {
      const wasIdle = queued === 0
      queued += 1
      if (wasIdle) setStatus('queued', { path: input.documentPath, error: null })
      const task = tail.then(() => performSave(input))
      tail = task.catch(() => undefined).finally(() => {
        queued -= 1
        if (queued === 0 && status.status === 'queued') {
          setStatus('idle', { operationId: null, path: null })
        }
      })
      return task
    },
    async readCurrent(documentPath) {
      return readDocument(projectRoot, documentPath)
    },
  }
}
