import { randomUUID } from 'node:crypto'
import { open, readFile, stat, unlink, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return Boolean(error && typeof error === 'object' && error.code === 'EPERM')
  }
}

async function readLock(lockFile) {
  try {
    return JSON.parse(await readFile(lockFile, 'utf-8'))
  } catch {
    return null
  }
}

async function removeStaleLock(lockFile, invalidLockGraceMs = 30_000) {
  const current = await readLock(lockFile)
  if (current && isProcessAlive(current.pid)) return false
  if (!current) {
    try {
      const lockStat = await stat(lockFile)
      if (Date.now() - lockStat.mtimeMs < invalidLockGraceMs) return false
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') return true
      return false
    }
  }

  try {
    await unlink(lockFile)
    return true
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return true
    return false
  }
}

export class PreviewLockTimeoutError extends Error {
  constructor(lockFile, timeoutMs) {
    super(`Timed out after ${timeoutMs} ms waiting for preview update lock: ${lockFile}`)
    this.name = 'PreviewLockTimeoutError'
    this.exitCode = 75
  }
}

export async function acquirePreviewLock({
  lockFile,
  timeoutMs = 180_000,
  pollIntervalMs = 250
}) {
  const normalizedLockFile = path.resolve(lockFile)
  const token = randomUUID()
  const deadline = Date.now() + timeoutMs
  await mkdir(path.dirname(normalizedLockFile), { recursive: true })

  while (true) {
    try {
      const handle = await open(normalizedLockFile, 'wx', 0o600)
      try {
        await handle.writeFile(
          `${JSON.stringify({ createdAt: new Date().toISOString(), pid: process.pid, token }, null, 2)}\n`,
          'utf-8'
        )
      } catch (error) {
        await handle.close()
        await unlink(normalizedLockFile).catch(() => {})
        throw error
      }
      await handle.close()

      return async () => {
        const current = await readLock(normalizedLockFile)
        if (!current || current.token !== token) return
        try {
          await unlink(normalizedLockFile)
        } catch (error) {
          if (!(error && typeof error === 'object' && error.code === 'ENOENT')) throw error
        }
      }
    } catch (error) {
      if (!(error && typeof error === 'object' && error.code === 'EEXIST')) throw error
      if (await removeStaleLock(normalizedLockFile)) continue
      if (Date.now() >= deadline) throw new PreviewLockTimeoutError(normalizedLockFile, timeoutMs)
      await sleep(pollIntervalMs)
    }
  }
}

export async function withPreviewLock(options, action) {
  const release = await acquirePreviewLock(options)
  try {
    return await action()
  } finally {
    await release()
  }
}

async function runCommand(command, args) {
  const child = spawn(command, args, { stdio: 'inherit', shell: false })
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code, signal) => {
      if (code === 0) resolve()
      else if (signal) reject(new Error(`${command} terminated by ${signal}`))
      else reject(new Error(`${command} exited with code ${code}`))
    })
  })
}

function readArg(argv, name) {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

async function main() {
  const argv = process.argv.slice(2)
  const separator = argv.indexOf('--')
  if (separator < 0 || separator === argv.length - 1) {
    throw new Error('Usage: node scripts/run-with-preview-lock.mjs --lock-file PATH [--timeout MS] -- COMMAND [ARGS...]')
  }

  const lockFile = readArg(argv.slice(0, separator), '--lock-file')
  if (!lockFile) throw new Error('--lock-file is required')
  const timeoutValue = readArg(argv.slice(0, separator), '--timeout') || '180000'
  const timeoutMs = Number.parseInt(timeoutValue, 10)
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('--timeout must be a positive integer')
  }

  const [command, ...args] = argv.slice(separator + 1)
  await withPreviewLock({ lockFile, timeoutMs }, () => runCommand(command, args))
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(error && typeof error === 'object' && error.exitCode ? error.exitCode : 1)
  })
}
