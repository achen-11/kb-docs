import { execFile, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { appendFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import { assertArtifactGitRoot } from './prepare-kooboo-artifact.mjs'
import { withPreviewLock } from './run-with-preview-lock.mjs'

const execFileAsync = promisify(execFile)
const MAX_LOG_CHARS = 24_000
const RUNNING_STATES = new Set(['queued', 'preparing', 'planning', 'deploying', 'verifying'])

export class PublishOperationError extends Error {
  constructor(statusCode, code, message, details = {}) {
    super(message)
    this.name = 'PublishOperationError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

function publicError(error) {
  const stderr = error && typeof error === 'object' && 'stderr' in error ? String(error.stderr || '').trim() : ''
  return (stderr || (error instanceof Error ? error.message : String(error))).slice(-8_000)
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

async function runGit(cwd, args, options = {}) {
  try {
    return await execFileAsync('git', args, {
      cwd,
      encoding: 'utf8',
      env: options.env ? { ...process.env, ...options.env } : process.env,
      maxBuffer: 16 * 1024 * 1024,
    })
  } catch (error) {
    if (options.allowFailure) return { failed: true, error, stdout: String(error?.stdout || ''), stderr: String(error?.stderr || '') }
    throw new PublishOperationError(500, 'PUBLISH_GIT_FAILED', publicError(error))
  }
}

function runCommand(command, args, { cwd, env, onOutput }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.on('data', (chunk) => onOutput?.(chunk.toString('utf8')))
    child.stderr.on('data', (chunk) => onOutput?.(chunk.toString('utf8')))
    child.once('error', reject)
    child.once('close', (code, signal) => {
      if (code === 0) resolve()
      else if (signal) reject(new Error(`${command} terminated by ${signal}`))
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

function normalizeUrl(value) {
  return new URL(value).toString().replace(/\/$/u, '')
}

function validateCommit(value, name) {
  if (!/^[a-f0-9]{40}$/u.test(String(value || ''))) {
    throw new PublishOperationError(400, 'INVALID_PUBLISH_COMMIT', `${name} 不是有效的 Git commit。`)
  }
  return String(value)
}

async function assertCleanSource(projectRoot, expectedCommit) {
  const [{ stdout: headOutput }, { stdout: statusOutput }] = await Promise.all([
    runGit(projectRoot, ['rev-parse', 'HEAD']),
    runGit(projectRoot, ['status', '--porcelain=v1', '--untracked-files=all']),
  ])
  const head = headOutput.trim()
  if (head !== expectedCommit) {
    throw new PublishOperationError(409, 'PUBLISH_HEAD_CHANGED', '服务器版本已经变化，请刷新后重新发布。', { head })
  }
  if (statusOutput.trim()) {
    throw new PublishOperationError(409, 'PUBLISH_WORKSPACE_DIRTY', '服务器还有未提交改动，请先在“改动与发布”中处理。')
  }
}

async function assertCleanArtifact(artifactDir, projectRoot) {
  assertArtifactGitRoot(artifactDir, projectRoot, path.join(projectRoot, 'kb-remote-site'))
  const [before, branch] = await Promise.all([
    runGit(artifactDir, ['status', '--porcelain=v1', '--untracked-files=all']),
    runGit(artifactDir, ['symbolic-ref', '--quiet', '--short', 'HEAD'], { allowFailure: true }),
  ])
  if (branch.failed || !branch.stdout.trim()) {
    throw new PublishOperationError(409, 'ARTIFACT_BRANCH_REQUIRED', 'Kooboo artifact 必须位于可持续保存部署历史的 Git 分支。')
  }
  if (before.stdout.trim()) {
    throw new PublishOperationError(409, 'ARTIFACT_WORKSPACE_DIRTY', 'Kooboo artifact 工作区存在未处理改动，需要管理员处理。')
  }
}

async function commitArtifact(artifactDir, sourceCommit, projectRoot) {
  assertArtifactGitRoot(artifactDir, projectRoot, path.join(projectRoot, 'kb-remote-site'))
  await runGit(artifactDir, ['add', '--all'])
  const staged = await runGit(artifactDir, ['diff', '--cached', '--quiet'], { allowFailure: true })
  if (staged.failed) {
    const gitEnvironment = {
      GIT_AUTHOR_NAME: 'Kooboo Docs Studio',
      GIT_AUTHOR_EMAIL: 'docs-studio@kooboo.internal',
      GIT_COMMITTER_NAME: 'Kooboo Docs Studio',
      GIT_COMMITTER_EMAIL: 'docs-studio@kooboo.internal',
    }
    await runGit(artifactDir, ['commit', '-m', `chore(deploy): prepare docs artifact for ${sourceCommit.slice(0, 8)}`], { env: gitEnvironment })
  }
  const { stdout } = await runGit(artifactDir, ['rev-parse', 'HEAD'])
  return stdout.trim()
}

export async function runKoobooPublication({
  operationId,
  sourceCommit,
  applyDeletes,
  projectRoot,
  artifactDir,
  baselineFile,
  initialBaselineCommit,
  targetUrl,
  verifyPaths,
  update,
}) {
  const logs = []
  const addLog = (chunk) => {
    logs.push(chunk)
    const joined = logs.join('')
    if (joined.length > MAX_LOG_CHARS) logs.splice(0, logs.length, joined.slice(-MAX_LOG_CHARS))
  }
  const commandOptions = (cwd, env = {}) => ({ cwd, env, onOutput: addLog })
  const baseStatus = { operationId, sourceCommit, targetUrl, startedAt: new Date().toISOString() }

  await assertCleanSource(projectRoot, sourceCommit)
  await assertCleanArtifact(artifactDir, projectRoot)
  await update({ ...baseStatus, status: 'preparing', message: '正在构建文档并准备 Kooboo 资源…' })
  await runCommand('corepack', ['pnpm', 'docs:artifact:prepare'], commandOptions(projectRoot, {
    KOOBOO_ARTIFACT_DIR: artifactDir,
  }))

  const artifactCommit = await commitArtifact(artifactDir, sourceCommit, projectRoot)
  const marker = await readJson(path.join(artifactDir, '.kooboo-artifact.json'))
  if (marker?.sourceCommit !== sourceCommit) {
    throw new PublishOperationError(500, 'ARTIFACT_SOURCE_MISMATCH', '生成的 Kooboo artifact 与待发布版本不一致。')
  }

  const baseline = await readJson(baselineFile)
  const fromCommit = validateCommit(baseline?.artifactCommit || initialBaselineCommit, '部署基线')
  validateCommit(artifactCommit, '候选 artifact')
  await runGit(artifactDir, ['cat-file', '-e', `${fromCommit}^{commit}`])

  await update({
    ...baseStatus,
    artifactCommit,
    fromArtifactCommit: fromCommit,
    status: 'planning',
    message: '正在生成发布计划并检查删除项…',
  })
  const deployEnvironment = {
    KOOBOO_ARTIFACT_DIR: artifactDir,
    KOOBOO_DEPLOY_FROM: fromCommit,
    KOOBOO_DEPLOY_TO: artifactCommit,
  }
  await runCommand('corepack', ['pnpm', 'docs:deploy:kooboo:dry-run'], commandOptions(projectRoot, deployEnvironment))
  const plan = await readJson(path.join(artifactDir, '.kooboo', 'deploy-plan.json'))
  if (!plan || plan.source?.from !== fromCommit || plan.source?.to !== artifactCommit) {
    throw new PublishOperationError(500, 'INVALID_DEPLOY_PLAN', '部署计划缺失或 commit 范围不一致。')
  }
  if (normalizeUrl(plan.expectedSite?.url || '') !== normalizeUrl(targetUrl)) {
    throw new PublishOperationError(409, 'PUBLISH_TARGET_MISMATCH', 'Kooboo 凭据指向的站点与编辑器显示的发布目标不一致。')
  }
  const summary = {
    upsert: Number(plan.summary?.upsert || 0),
    delete: Number(plan.summary?.delete || 0),
    skipped: Number(plan.summary?.skipped || 0),
  }
  if (summary.delete > 0 && !applyDeletes) {
    return update({
      ...baseStatus,
      artifactCommit,
      fromArtifactCommit: fromCommit,
      status: 'approval_required',
      message: `发布计划包含 ${summary.delete} 个删除项，需要再次确认。`,
      summary,
      planDigest: plan.planDigest,
      finishedAt: new Date().toISOString(),
      logTail: logs.join('').slice(-MAX_LOG_CHARS),
    })
  }

  await update({
    ...baseStatus,
    artifactCommit,
    fromArtifactCommit: fromCommit,
    status: 'deploying',
    message: '正在上传 Kooboo 资源…',
    summary,
  })
  const deployArgs = ['pnpm', 'docs:deploy:kooboo']
  if (applyDeletes) deployArgs.push('--', '--apply-deletes')
  await runCommand('corepack', deployArgs, commandOptions(projectRoot, deployEnvironment))
  const receipt = await readJson(path.join(artifactDir, '.kooboo', 'deploy-receipt.json'))
  if (!receipt?.success || Number(receipt.summary?.failed || 0) > 0 || Number(receipt.summary?.verificationFailed || 0) > 0) {
    throw new PublishOperationError(502, 'KOOBOO_DEPLOY_FAILED', 'Kooboo 部署回执未通过。')
  }

  await update({
    ...baseStatus,
    artifactCommit,
    fromArtifactCommit: fromCommit,
    status: 'verifying',
    message: '资源已上传，正在验证真实页面和浏览器水合…',
    summary,
  })
  await runCommand('corepack', ['pnpm', 'docs:verify:kooboo'], commandOptions(projectRoot, {
    KOOBOO_VERIFY_URL: targetUrl,
    ...(verifyPaths ? { KOOBOO_VERIFY_PATHS: verifyPaths } : {}),
  }))

  const finishedAt = new Date().toISOString()
  await writeJsonAtomically(baselineFile, {
    schemaVersion: 1,
    artifactCommit,
    sourceCommit,
    targetUrl,
    receiptDeploymentId: receipt.deploymentId || null,
    updatedAt: finishedAt,
  })
  return update({
    ...baseStatus,
    artifactCommit,
    fromArtifactCommit: fromCommit,
    status: 'succeeded',
    message: 'Kooboo 站点发布并验收成功。',
    summary,
    receipt: {
      deploymentId: receipt.deploymentId || null,
      succeeded: Number(receipt.summary?.succeeded || 0),
      verified: Number(receipt.summary?.verified || 0),
    },
    finishedAt,
    logTail: logs.join('').slice(-MAX_LOG_CHARS),
  })
}

export function createPublishCoordinator({
  enabled,
  projectRoot,
  artifactDir,
  baselineFile,
  initialBaselineCommit,
  targetUrl,
  verifyPaths,
  auditLog,
  lockFile,
  lockTimeoutMs = 3_600_000,
  runPublication = runKoobooPublication,
}) {
  let activePromise = null
  let starting = false
  const statusFile = `${baselineFile}.status.json`

  async function getStatus() {
    const current = await readJson(statusFile)
    if (current && RUNNING_STATES.has(current.status) && !activePromise && !starting) {
      return writeStatus({
        ...current,
        status: 'failed',
        message: '上一次发布被服务重启中断，请重新发起。',
        errorCode: 'PUBLISH_INTERRUPTED',
        finishedAt: new Date().toISOString(),
      })
    }
    return current || {
      status: 'idle',
      targetUrl,
      message: enabled ? '尚未开始发布。' : 'Kooboo 发布尚未配置。',
    }
  }

  async function writeStatus(status) {
    await writeJsonAtomically(statusFile, status)
    return status
  }

  async function start({ actor, expectedCommit, applyDeletes = false }) {
    if (!enabled) throw new PublishOperationError(503, 'PUBLISH_NOT_CONFIGURED', '管理员尚未配置 Kooboo 发布目标。')
    const sourceCommit = validateCommit(expectedCommit, '待发布版本')
    if (activePromise || starting) throw new PublishOperationError(409, 'PUBLISH_IN_PROGRESS', '已有一个发布任务正在执行。')
    starting = true
    try {
      const current = await getStatus()
      if (RUNNING_STATES.has(current.status)) {
        await writeStatus({ ...current, status: 'failed', message: '上一次发布被服务重启中断，请重新发起。', finishedAt: new Date().toISOString() })
      }
      await assertCleanSource(projectRoot, sourceCommit)
      const operationId = randomUUID()
      const queued = await writeStatus({
        operationId,
        sourceCommit,
        targetUrl,
        status: 'queued',
        message: '发布任务已进入队列。',
        startedAt: new Date().toISOString(),
      })
      await appendAudit(auditLog, { at: new Date().toISOString(), actor, operationId, sourceCommit, targetUrl, applyDeletes, outcome: 'publish_requested' })

      activePromise = withPreviewLock({ lockFile, timeoutMs: lockTimeoutMs }, () => runPublication({
        operationId,
        sourceCommit,
        applyDeletes,
        projectRoot,
        artifactDir,
        baselineFile,
        initialBaselineCommit,
        targetUrl,
        verifyPaths,
        update: writeStatus,
      })).then(async (result) => {
        await appendAudit(auditLog, { at: new Date().toISOString(), actor, operationId, sourceCommit, targetUrl, outcome: result.status === 'succeeded' ? 'publish_succeeded' : 'publish_waiting_for_delete_approval' })
        return result
      }).catch(async (error) => {
        const failed = await writeStatus({
          operationId,
          sourceCommit,
          targetUrl,
          status: 'failed',
          message: publicError(error),
          errorCode: error instanceof PublishOperationError ? error.code : 'PUBLISH_FAILED',
          finishedAt: new Date().toISOString(),
        })
        await appendAudit(auditLog, { at: new Date().toISOString(), actor, operationId, sourceCommit, targetUrl, error: failed.message, outcome: 'publish_failed' })
        return failed
      }).finally(() => {
        activePromise = null
      })
      starting = false

      return queued
    } catch (error) {
      starting = false
      throw error
    }
  }

  return { available: Boolean(enabled), getStatus, isRunning: () => Boolean(activePromise || starting), start, targetUrl }
}
