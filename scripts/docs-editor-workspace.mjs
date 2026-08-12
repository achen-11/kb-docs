import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { appendFile, lstat, mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import { withPreviewLock } from './run-with-preview-lock.mjs'

const execFileAsync = promisify(execFile)
const MAX_GIT_OUTPUT_BYTES = 10 * 1024 * 1024
const MAX_DIFF_BYTES = 768 * 1024
const MAX_PUBLIC_ERROR_CHARS = 8_000

export class WorkspaceOperationError extends Error {
  constructor(statusCode, code, message, details = {}) {
    super(message)
    this.name = 'WorkspaceOperationError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

function publicError(error) {
  const stderr = error && typeof error === 'object' && 'stderr' in error ? String(error.stderr || '').trim() : ''
  const message = stderr || (error instanceof Error ? error.message : String(error))
  return message.slice(-MAX_PUBLIC_ERROR_CHARS)
}

async function runGit(projectRoot, args, options = {}) {
  try {
    return await execFileAsync('git', args, {
      cwd: projectRoot,
      encoding: 'utf8',
      env: options.env ? { ...process.env, ...options.env } : process.env,
      maxBuffer: MAX_GIT_OUTPUT_BYTES,
    })
  } catch (error) {
    if (options.allowFailure) return { failed: true, error, stdout: String(error?.stdout || ''), stderr: String(error?.stderr || '') }
    throw new WorkspaceOperationError(500, 'GIT_COMMAND_FAILED', publicError(error))
  }
}

function validateGitTarget(value, name) {
  if (
    typeof value !== 'string' || !value || value.startsWith('-') || value.includes('..') ||
    /[\s~^:?*\[\\\x00-\x1f\x7f]/u.test(value)
  ) {
    throw new Error(`${name} is invalid`)
  }
  return value
}

function parsePorcelain(output) {
  const records = output.split('\0')
  const entries = []
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    if (!record) continue
    const indexStatus = record[0]
    const worktreeStatus = record[1]
    const filePath = record.slice(3)
    let originalPath = null
    if (['R', 'C'].includes(indexStatus) || ['R', 'C'].includes(worktreeStatus)) {
      originalPath = records[index + 1] || null
      index += 1
    }
    entries.push({ filePath, indexStatus, originalPath, worktreeStatus })
  }
  return entries
}

function isDocsPath(filePath) {
  return typeof filePath === 'string' && filePath.startsWith('docs/') && !filePath.includes('\0')
}

function statusLabel(entry) {
  const combined = `${entry.indexStatus}${entry.worktreeStatus}`
  if (combined === '??') return 'untracked'
  if (combined.includes('R')) return 'renamed'
  if (combined.includes('C')) return 'copied'
  if (combined.includes('D')) return 'deleted'
  if (combined.includes('A')) return 'added'
  return 'modified'
}

function parseNumstat(output) {
  const result = new Map()
  for (const line of output.split('\n')) {
    if (!line) continue
    const [added, deleted, ...pathParts] = line.split('\t')
    const filePath = pathParts.join('\t')
    result.set(filePath, {
      additions: added === '-' ? null : Number.parseInt(added, 10),
      deletions: deleted === '-' ? null : Number.parseInt(deleted, 10),
      binary: added === '-' || deleted === '-',
    })
  }
  return result
}

async function untrackedStats(projectRoot, filePath) {
  try {
    const content = await readFile(path.join(projectRoot, filePath))
    const binary = content.includes(0)
    return {
      additions: binary ? null : content.toString('utf8').split('\n').length - (content.endsWith('\n') ? 1 : 0),
      deletions: binary ? null : 0,
      binary,
    }
  } catch {
    return { additions: null, deletions: null, binary: true }
  }
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
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

async function appendAudit(auditLog, event) {
  await mkdir(path.dirname(auditLog), { recursive: true })
  await appendFile(auditLog, `${JSON.stringify({ schemaVersion: 1, ...event })}\n`, { encoding: 'utf8', mode: 0o640 })
}

function validateCommitMessage(value) {
  const message = typeof value === 'string' ? value.trim() : ''
  if (message.length < 5 || message.length > 120 || /[\r\n\0]/u.test(message)) {
    throw new WorkspaceOperationError(400, 'INVALID_COMMIT_MESSAGE', '修改说明需要 5–120 个字符，且只能填写一行。')
  }
  return message
}

function ensureFreshSnapshot(snapshot, expectedFingerprint) {
  if (!/^[a-f0-9]{64}$/u.test(String(expectedFingerprint || '')) || snapshot.fingerprint !== expectedFingerprint) {
    throw new WorkspaceOperationError(409, 'WORKSPACE_CHANGED', '服务器改动已经变化，请刷新后重新确认。', {
      workspace: snapshot,
    })
  }
}

function ensureWritableSnapshot(snapshot) {
  if (snapshot.stagedFiles > 0) {
    throw new WorkspaceOperationError(409, 'STAGED_CHANGES_PRESENT', '检测到平台之外产生的暂存改动，需要管理员先处理。')
  }
  if (snapshot.outOfScopeFiles > 0) {
    throw new WorkspaceOperationError(409, 'OUT_OF_SCOPE_CHANGES', '仓库存在 docs 目录之外的改动，需要管理员先处理后才能提交。')
  }
}

async function safeUnlink(projectRoot, filePath) {
  if (!isDocsPath(filePath)) throw new WorkspaceOperationError(400, 'INVALID_WORKSPACE_PATH', '只能撤销 docs 目录中的改动。')
  const candidate = path.resolve(projectRoot, filePath)
  const docsRoot = path.resolve(projectRoot, 'docs')
  const relative = path.relative(docsRoot, candidate)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new WorkspaceOperationError(400, 'INVALID_WORKSPACE_PATH', '文件路径超出 docs 目录。')
  }
  const metadata = await lstat(candidate).catch((error) => error?.code === 'ENOENT' ? null : Promise.reject(error))
  if (!metadata) return
  if (metadata.isDirectory()) throw new WorkspaceOperationError(400, 'INVALID_WORKSPACE_PATH', '不能通过文档平台递归删除目录。')
  await unlink(candidate)
}

export function createWorkspaceCoordinator({
  projectRoot,
  draftStateFile,
  auditLog,
  lockFile,
  lockTimeoutMs = 180_000,
  gitRemote = 'origin',
  gitBranch,
  gitAuthorName = 'Kooboo Docs Studio',
  gitAuthorEmail = 'docs-studio@kooboo.internal',
}) {
  const remote = validateGitTarget(gitRemote, 'Git remote')
  const branch = gitBranch ? validateGitTarget(gitBranch, 'Git branch') : null

  async function currentBranch() {
    const { stdout } = await runGit(projectRoot, ['symbolic-ref', '--quiet', '--short', 'HEAD'])
    return stdout.trim()
  }

  async function getStatus() {
    const [{ stdout: porcelain }, { stdout: headOutput }, { stdout: numstatOutput }, { stdout: diffOutput }, draftState] = await Promise.all([
      runGit(projectRoot, ['status', '--porcelain=v1', '-z', '--untracked-files=all']),
      runGit(projectRoot, ['rev-parse', 'HEAD']),
      runGit(projectRoot, ['diff', 'HEAD', '--numstat', '--', 'docs']),
      runGit(projectRoot, ['diff', 'HEAD', '--binary', '--', 'docs']),
      readJson(draftStateFile),
    ])
    const head = headOutput.trim()
    const parsed = parsePorcelain(porcelain)
    const docsEntries = parsed.filter((entry) => isDocsPath(entry.filePath) || isDocsPath(entry.originalPath))
    const outOfScopeEntries = parsed.filter((entry) => !isDocsPath(entry.filePath) && !isDocsPath(entry.originalPath))
    const numstat = parseNumstat(numstatOutput)
    const files = await Promise.all(docsEntries.map(async (entry) => {
      const state = statusLabel(entry)
      const stats = state === 'untracked'
        ? await untrackedStats(projectRoot, entry.filePath)
        : numstat.get(entry.filePath) || numstat.get(entry.originalPath) || { additions: null, deletions: null, binary: false }
      return {
        path: entry.filePath,
        originalPath: entry.originalPath,
        status: state,
        staged: entry.indexStatus !== ' ' && entry.indexStatus !== '?',
        ...stats,
      }
    }))
    files.sort((left, right) => left.path.localeCompare(right.path, 'zh-CN'))

    const activeBranch = await currentBranch()
    const targetBranch = branch || activeBranch
    const remoteRef = `refs/remotes/${remote}/${targetBranch}`
    const remoteExists = !(await runGit(projectRoot, ['show-ref', '--verify', '--quiet', remoteRef], { allowFailure: true })).failed
    let ahead = null
    let behind = null
    if (remoteExists) {
      const { stdout } = await runGit(projectRoot, ['rev-list', '--left-right', '--count', `${remoteRef}...HEAD`])
      const [remoteOnly, localOnly] = stdout.trim().split(/\s+/u).map(Number)
      behind = remoteOnly
      ahead = localOnly
    }

    const untrackedHashes = []
    for (const entry of docsEntries.filter((item) => statusLabel(item) === 'untracked')) {
      const content = await readFile(path.join(projectRoot, entry.filePath))
      untrackedHashes.push(`${entry.filePath}\0${createHash('sha256').update(content).digest('hex')}`)
    }
    const fingerprint = createHash('sha256')
      .update(`${head}\0${porcelain}\0${diffOutput}\0${untrackedHashes.join('\0')}`)
      .digest('hex')
    return {
      ahead,
      behind,
      branch: activeBranch,
      changedFiles: files.length,
      files,
      fingerprint,
      head,
      outOfScopeFiles: outOfScopeEntries.length,
      pendingPush: Boolean(draftState?.pendingPush),
      pendingPushCommit: draftState?.pendingPush ? String(draftState.commit || '') : null,
      remote,
      remoteBranch: targetBranch,
      stagedFiles: files.filter((file) => file.staged).length,
    }
  }

  async function getDiff(filePath) {
    const snapshot = await getStatus()
    const entry = snapshot.files.find((file) => file.path === filePath)
    if (!entry) throw new WorkspaceOperationError(404, 'WORKSPACE_FILE_NOT_FOUND', '该文件已不在当前改动中。')
    if (entry.binary) return { path: entry.path, binary: true, diff: '', truncated: false }

    let diff
    if (entry.status === 'untracked') {
      const content = await readFile(path.join(projectRoot, entry.path), 'utf8')
      diff = `diff --git a/${entry.path} b/${entry.path}\nnew file mode 100644\n--- /dev/null\n+++ b/${entry.path}\n${content.split('\n').map((line) => `+${line}`).join('\n')}`
    } else {
      const { stdout } = await runGit(projectRoot, ['diff', 'HEAD', '--no-ext-diff', '--no-color', '--unified=3', '--', entry.path])
      diff = stdout
    }
    const buffer = Buffer.from(diff)
    const truncated = buffer.length > MAX_DIFF_BYTES
    return {
      path: entry.path,
      binary: false,
      diff: truncated ? buffer.subarray(0, MAX_DIFF_BYTES).toString('utf8') : diff,
      truncated,
    }
  }

  async function updateDraftMarkerAfterMutation() {
    const snapshot = await getStatus()
    if (snapshot.changedFiles === 0 && !snapshot.pendingPush) {
      await unlink(draftStateFile).catch((error) => { if (error?.code !== 'ENOENT') throw error })
    }
    return getStatus()
  }

  async function revert({ paths, expectedFingerprint, actor }) {
    return withPreviewLock({ lockFile, timeoutMs: lockTimeoutMs }, async () => {
      const snapshot = await getStatus()
      ensureFreshSnapshot(snapshot, expectedFingerprint)
      ensureWritableSnapshot(snapshot)
      const requested = Array.isArray(paths) && paths.length ? [...new Set(paths)] : snapshot.files.map((file) => file.path)
      if (!requested.length) throw new WorkspaceOperationError(400, 'NO_CHANGES', '当前没有可撤销的文档改动。')
      const selected = requested.map((filePath) => {
        const entry = snapshot.files.find((file) => file.path === filePath)
        if (!entry) throw new WorkspaceOperationError(400, 'INVALID_WORKSPACE_PATH', '只能撤销当前列表中的文档改动。')
        return entry
      })
      const tracked = selected.filter((entry) => entry.status !== 'untracked').flatMap((entry) => [entry.path, entry.originalPath].filter(Boolean))
      if (tracked.length) await runGit(projectRoot, ['restore', '--source=HEAD', '--worktree', '--', ...tracked])
      for (const entry of selected.filter((item) => item.status === 'untracked')) await safeUnlink(projectRoot, entry.path)
      const result = await updateDraftMarkerAfterMutation()
      await appendAudit(auditLog, { at: new Date().toISOString(), actor, outcome: 'workspace_reverted', paths: selected.map((entry) => entry.path) })
      return result
    })
  }

  async function pushCommit(commit, actor) {
    const targetBranch = branch || await currentBranch()
    const push = await runGit(projectRoot, ['push', remote, `HEAD:refs/heads/${targetBranch}`], { allowFailure: true })
    if (push.failed) {
      await appendAudit(auditLog, { at: new Date().toISOString(), actor, commit, error: publicError(push.error), outcome: 'workspace_push_error', remote, branch: targetBranch })
      throw new WorkspaceOperationError(502, 'GIT_PUSH_FAILED', '改动已经提交到服务器 Git，但推送审核分支失败。可以稍后重试推送。', {
        commit,
        gitError: publicError(push.error),
      })
    }
    await unlink(draftStateFile).catch((error) => { if (error?.code !== 'ENOENT') throw error })
    await appendAudit(auditLog, { at: new Date().toISOString(), actor, commit, outcome: 'workspace_pushed', remote, branch: targetBranch })
    return { branch: targetBranch, commit, pushed: true, remote, workspace: await getStatus() }
  }

  async function commit({ message, expectedFingerprint, actor }) {
    const normalizedMessage = validateCommitMessage(message)
    return withPreviewLock({ lockFile, timeoutMs: lockTimeoutMs }, async () => {
      const snapshot = await getStatus()
      ensureFreshSnapshot(snapshot, expectedFingerprint)
      ensureWritableSnapshot(snapshot)
      if (snapshot.pendingPush) {
        throw new WorkspaceOperationError(409, 'PENDING_PUSH_EXISTS', '已有一个版本等待推送，请先重试推送后再提交新的改动。')
      }
      if (!snapshot.changedFiles) throw new WorkspaceOperationError(400, 'NO_CHANGES', '当前没有可提交的文档改动。')
      if (branch && snapshot.branch !== branch) {
        throw new WorkspaceOperationError(409, 'WRONG_GIT_BRANCH', `服务器当前位于 ${snapshot.branch}，预期审核分支为 ${branch}。`)
      }
      const gitEnvironment = {
        GIT_AUTHOR_NAME: gitAuthorName,
        GIT_AUTHOR_EMAIL: gitAuthorEmail,
        GIT_COMMITTER_NAME: gitAuthorName,
        GIT_COMMITTER_EMAIL: gitAuthorEmail,
      }
      await runGit(projectRoot, ['add', '--all', '--', 'docs'])
      const commitResult = await runGit(projectRoot, ['commit', '-m', normalizedMessage, '--', 'docs'], { allowFailure: true, env: gitEnvironment })
      if (commitResult.failed) {
        await runGit(projectRoot, ['reset', '--mixed', 'HEAD', '--', 'docs'], { allowFailure: true })
        throw new WorkspaceOperationError(500, 'GIT_COMMIT_FAILED', publicError(commitResult.error))
      }
      const { stdout } = await runGit(projectRoot, ['rev-parse', 'HEAD'])
      const commitHash = stdout.trim()
      await writeJsonAtomically(draftStateFile, {
        schemaVersion: 1,
        active: true,
        updatedAt: new Date().toISOString(),
        pendingPush: true,
        commit: commitHash,
        branch: branch || snapshot.branch,
        remote,
      })
      await appendAudit(auditLog, { at: new Date().toISOString(), actor, commit: commitHash, message: normalizedMessage, outcome: 'workspace_committed', paths: snapshot.files.map((file) => file.path) })
      return pushCommit(commitHash, actor)
    })
  }

  async function retryPush({ actor }) {
    return withPreviewLock({ lockFile, timeoutMs: lockTimeoutMs }, async () => {
      const [snapshot, marker] = await Promise.all([getStatus(), readJson(draftStateFile)])
      ensureWritableSnapshot(snapshot)
      if (snapshot.changedFiles) throw new WorkspaceOperationError(409, 'WORKSPACE_CHANGED', '待推送提交之后又出现了新的文档改动，请先处理这些改动。')
      if (!marker?.pendingPush || !/^[a-f0-9]{40}$/u.test(String(marker.commit || ''))) {
        throw new WorkspaceOperationError(400, 'NO_PENDING_PUSH', '当前没有等待推送的提交。')
      }
      if (snapshot.head !== marker.commit) {
        throw new WorkspaceOperationError(409, 'PENDING_PUSH_HEAD_MISMATCH', '服务器 HEAD 与待推送提交不一致，需要管理员处理。')
      }
      return pushCommit(marker.commit, actor)
    })
  }

  async function getRecentCommits(limit = 8) {
    const count = Math.max(1, Math.min(20, Number.parseInt(limit, 10) || 8))
    const { stdout } = await runGit(projectRoot, ['log', `-${count}`, '--format=%H%x00%h%x00%an%x00%aI%x00%s', '--', 'docs'])
    return stdout.trim().split('\n').filter(Boolean).map((line) => {
      const [hash, shortHash, author, authoredAt, subject] = line.split('\0')
      return { hash, shortHash, author, authoredAt, subject }
    })
  }

  return { commit, getDiff, getRecentCommits, getStatus, retryPush, revert }
}
