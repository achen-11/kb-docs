import { execFile, spawn } from 'node:child_process'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { withPreviewLock } from './run-with-preview-lock.mjs'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

function readArg(argv, name) {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

function assertRemoteName(value) {
  if (!/^[A-Za-z0-9._-]+$/u.test(value)) {
    throw new Error('Git remote name contains unsupported characters')
  }
  return value
}

function assertBranchName(value) {
  if (
    !value ||
    value.startsWith('-') ||
    value.startsWith('/') ||
    value.endsWith('/') ||
    value.endsWith('.') ||
    value.includes('..') ||
    value.includes('//') ||
    value.includes('@{') ||
    /[\s~^:?*\[\\\x00-\x1f\x7f]/u.test(value) ||
    value.split('/').some((part) => !part || part.startsWith('.') || part.endsWith('.lock'))
  ) {
    throw new Error('Git branch name is invalid')
  }
  return value
}

function readPositiveInteger(value, fallback, name) {
  if (value === undefined) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return parsed
}

async function runGit(appDir, args, options = {}) {
  try {
    return await execFileAsync('git', args, {
      cwd: appDir,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    })
  } catch (error) {
    if (options.allowFailure) return { failed: true, error }
    const detail = error && typeof error === 'object' && error.stderr ? String(error.stderr).trim() : ''
    throw new Error(`git ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`)
  }
}

async function runCommand(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: 'inherit', shell: false })
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code, signal) => {
      if (code === 0) resolve()
      else if (signal) reject(new Error(`${command} terminated by ${signal}`))
      else reject(new Error(`${command} exited with code ${code}`))
    })
  })
}

async function readSyncState(stateFile) {
  try {
    return JSON.parse(await readFile(stateFile, 'utf-8'))
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return null
    throw new Error(`Invalid Git preview sync state: ${error instanceof Error ? error.message : error}`)
  }
}

async function writeSyncState(stateFile, state) {
  await mkdir(path.dirname(stateFile), { recursive: true })
  const temporaryFile = `${stateFile}.${process.pid}.${Date.now()}.tmp`
  try {
    await writeFile(temporaryFile, `${JSON.stringify(state, null, 2)}\n`, 'utf-8')
    await rename(temporaryFile, stateFile)
  } catch (error) {
    await rm(temporaryFile, { force: true })
    throw error
  }
}

export async function syncPreviewFromGit({
  appDir = projectRoot,
  branch = 'main',
  envFile = '/etc/kb-docs-preview/preview.env',
  lockFile,
  lockTimeoutMs = 180_000,
  remote = 'origin',
  stateFile,
  updateCommand
} = {}) {
  const normalizedAppDir = path.resolve(appDir)
  const normalizedRemote = assertRemoteName(remote)
  const normalizedBranch = assertBranchName(branch)
  const previewRoot = process.env.DOCS_PREVIEW_ROOT || path.join(normalizedAppDir, '.local-preview')
  const normalizedLockFile = path.resolve(lockFile || path.join(previewRoot, '.update.lock'))
  const normalizedStateFile = path.resolve(
    stateFile || process.env.DOCS_PREVIEW_GIT_STATE_FILE || path.join(previewRoot, '.git-sync-state.json')
  )

  return withPreviewLock(
    { lockFile: normalizedLockFile, timeoutMs: lockTimeoutMs },
    async () => {
      const repositoryCheck = await runGit(
        normalizedAppDir,
        ['rev-parse', '--is-inside-work-tree'],
        { allowFailure: true }
      )
      if (repositoryCheck.failed || repositoryCheck.stdout.trim() !== 'true') {
        throw new Error(`Application directory is not a Git worktree: ${normalizedAppDir}`)
      }

      await runGit(normalizedAppDir, ['remote', 'get-url', normalizedRemote])
      await runGit(normalizedAppDir, [
        'fetch',
        '--prune',
        normalizedRemote,
        `refs/heads/${normalizedBranch}`
      ])

      const { stdout: statusOutput } = await runGit(normalizedAppDir, [
        'status',
        '--porcelain',
        '--untracked-files=normal'
      ])
      if (statusOutput.trim()) {
        throw new Error('Refusing automatic Git update because the preview worktree is dirty')
      }

      const [{ stdout: headOutput }, { stdout: targetOutput }] = await Promise.all([
        runGit(normalizedAppDir, ['rev-parse', 'HEAD']),
        runGit(normalizedAppDir, ['rev-parse', 'FETCH_HEAD'])
      ])
      const previousHead = headOutput.trim()
      const targetCommit = targetOutput.trim()

      if (previousHead !== targetCommit) {
        const ancestorCheck = await runGit(
          normalizedAppDir,
          ['merge-base', '--is-ancestor', previousHead, targetCommit],
          { allowFailure: true }
        )
        if (ancestorCheck.failed) {
          throw new Error(
            `Refusing non-fast-forward preview update: local ${previousHead.slice(0, 12)} is not an ancestor of ${normalizedRemote}/${normalizedBranch} ${targetCommit.slice(0, 12)}`
          )
        }
        await runGit(normalizedAppDir, ['merge', '--ff-only', targetCommit])
      }

      const existingState = await readSyncState(normalizedStateFile)
      if (
        existingState?.commit === targetCommit &&
        existingState?.remote === normalizedRemote &&
        existingState?.branch === normalizedBranch
      ) {
        console.log(`Preview is already published for ${normalizedRemote}/${normalizedBranch}@${targetCommit.slice(0, 12)}`)
        return { changed: false, commit: targetCommit, published: false }
      }

      const reason = `git sync ${normalizedRemote}/${normalizedBranch}@${targetCommit.slice(0, 12)}`
      const command = updateCommand || {
        command: '/bin/bash',
        args: [
          path.join(normalizedAppDir, 'deploy', 'preview', 'update.sh'),
          '--app-dir',
          normalizedAppDir,
          '--env-file',
          envFile,
          '--install-deps',
          '--reason',
          reason,
          '--skip-lock'
        ]
      }
      await runCommand(command.command, command.args, normalizedAppDir)

      const publishedAt = new Date().toISOString()
      await writeSyncState(normalizedStateFile, {
        schemaVersion: 1,
        branch: normalizedBranch,
        commit: targetCommit,
        publishedAt,
        remote: normalizedRemote
      })
      console.log(`Published ${normalizedRemote}/${normalizedBranch}@${targetCommit.slice(0, 12)}`)
      return {
        changed: previousHead !== targetCommit,
        commit: targetCommit,
        published: true,
        publishedAt
      }
    }
  )
}

async function main() {
  const argv = process.argv.slice(2)
  const appDir = readArg(argv, '--app-dir') || process.env.DOCS_PREVIEW_APP_DIR || projectRoot
  const previewRoot = process.env.DOCS_PREVIEW_ROOT || path.join(appDir, '.local-preview')
  const result = await syncPreviewFromGit({
    appDir,
    branch: readArg(argv, '--branch') || process.env.DOCS_PREVIEW_GIT_BRANCH || 'main',
    envFile:
      readArg(argv, '--env-file') ||
      process.env.DOCS_PREVIEW_ENV_FILE ||
      '/etc/kb-docs-preview/preview.env',
    lockFile:
      readArg(argv, '--lock-file') ||
      process.env.DOCS_PREVIEW_UPDATE_LOCK_FILE ||
      path.join(previewRoot, '.update.lock'),
    lockTimeoutMs: readPositiveInteger(
      readArg(argv, '--lock-timeout') || process.env.DOCS_PREVIEW_UPDATE_LOCK_TIMEOUT_MS,
      180_000,
      'preview update lock timeout'
    ),
    remote: readArg(argv, '--remote') || process.env.DOCS_PREVIEW_GIT_REMOTE || 'origin',
    stateFile:
      readArg(argv, '--state-file') ||
      process.env.DOCS_PREVIEW_GIT_STATE_FILE ||
      path.join(previewRoot, '.git-sync-state.json')
  })
  console.log(JSON.stringify(result, null, 2))
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(error && typeof error === 'object' && error.exitCode ? error.exitCode : 1)
  })
}
