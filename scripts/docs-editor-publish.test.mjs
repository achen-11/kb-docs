import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

import { PublishOperationError, createPublishCoordinator, runKoobooPublication } from './docs-editor-publish.mjs'

const execFileAsync = promisify(execFile)

async function createGitProject(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-publish-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(path.join(root, 'docs'), { recursive: true })
  await writeFile(path.join(root, 'docs', 'index.md'), '# Docs\n', 'utf8')
  await execFileAsync('git', ['init'], { cwd: root })
  await execFileAsync('git', ['config', 'user.name', 'Test'], { cwd: root })
  await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: root })
  await execFileAsync('git', ['add', '.'], { cwd: root })
  await execFileAsync('git', ['commit', '-m', 'docs: initial'], { cwd: root })
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: root })
  return { root, head: stdout.trim() }
}

async function waitForStatus(coordinator, expected) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const status = await coordinator.getStatus()
    if (status.status === expected) return status
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  assert.fail(`Timed out waiting for publish status ${expected}`)
}

test('publish coordinator queues one clean commit and persists completion status', async (t) => {
  const { root, head } = await createGitProject(t)
  const dataDir = path.join(root, '.publish-state')
  const baselineFile = path.join(dataDir, 'baseline.json')
  const coordinator = createPublishCoordinator({
    enabled: true,
    projectRoot: root,
    artifactDir: path.join(root, 'artifact'),
    baselineFile,
    initialBaselineCommit: '0'.repeat(40),
    targetUrl: 'https://docs.example.com',
    verifyPaths: '/',
    auditLog: path.join(dataDir, 'audit.jsonl'),
    lockFile: path.join(dataDir, 'publish.lock'),
    runPublication: async (input) => input.update({
      operationId: input.operationId,
      sourceCommit: input.sourceCommit,
      targetUrl: input.targetUrl,
      status: 'succeeded',
      message: 'Kooboo 站点发布并验收成功。',
      finishedAt: new Date().toISOString(),
    }),
  })

  const queued = await coordinator.start({ actor: 'test', expectedCommit: head })
  assert.equal(queued.status, 'queued')
  const succeeded = await waitForStatus(coordinator, 'succeeded')
  assert.equal(succeeded.sourceCommit, head)
  assert.match(await readFile(path.join(dataDir, 'audit.jsonl'), 'utf8'), /publish_succeeded/u)
})

test('publish coordinator rejects dirty source workspaces', async (t) => {
  const { root, head } = await createGitProject(t)
  await writeFile(path.join(root, 'docs', 'index.md'), '# Dirty\n', 'utf8')
  const coordinator = createPublishCoordinator({
    enabled: true,
    projectRoot: root,
    artifactDir: path.join(root, 'artifact'),
    baselineFile: path.join(root, '.publish-state', 'baseline.json'),
    initialBaselineCommit: '0'.repeat(40),
    targetUrl: 'https://docs.example.com',
    verifyPaths: '/',
    auditLog: path.join(root, '.publish-state', 'audit.jsonl'),
    lockFile: path.join(root, '.publish-state', 'publish.lock'),
  })

  await assert.rejects(
    () => coordinator.start({ actor: 'test', expectedCommit: head }),
    (error) => error instanceof PublishOperationError && error.code === 'PUBLISH_WORKSPACE_DIRTY'
  )
})

test('Kooboo publication prepares an artifact, deploys, verifies, and advances the baseline', async (t) => {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-publication-'))
  t.after(() => rm(sandbox, { recursive: true, force: true }))
  const sourceRoot = path.join(sandbox, 'source')
  const artifactDir = path.join(sandbox, 'artifact')
  const stateDir = path.join(sandbox, 'state')
  const binDir = path.join(sandbox, 'bin')
  await mkdir(path.join(sourceRoot, 'docs'), { recursive: true })
  await mkdir(binDir, { recursive: true })
  await writeFile(path.join(sourceRoot, 'docs', 'index.md'), '# Docs\n', 'utf8')
  await execFileAsync('git', ['init'], { cwd: sourceRoot })
  await execFileAsync('git', ['config', 'user.name', 'Test'], { cwd: sourceRoot })
  await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: sourceRoot })
  await execFileAsync('git', ['add', '.'], { cwd: sourceRoot })
  await execFileAsync('git', ['commit', '-m', 'docs: initial'], { cwd: sourceRoot })
  const { stdout: sourceHeadOutput } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot })
  const sourceCommit = sourceHeadOutput.trim()
  await execFileAsync('git', ['worktree', 'add', '-b', 'artifact', artifactDir, sourceCommit], { cwd: sourceRoot })
  const { stdout: baselineOutput } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: artifactDir })
  const initialBaselineCommit = baselineOutput.trim()

  const fakeCorepack = path.join(binDir, 'corepack')
  await writeFile(fakeCorepack, `#!/usr/bin/env node
const { execFileSync } = require('node:child_process')
const { mkdirSync, writeFileSync } = require('node:fs')
const path = require('node:path')
const command = process.argv.slice(2).join(' ')
const artifact = process.env.KOOBOO_ARTIFACT_DIR
if (command.includes('docs:artifact:prepare')) {
  const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: process.cwd(), encoding: 'utf8' }).trim()
  mkdirSync(path.join(artifact, 'src', 'page'), { recursive: true })
  writeFileSync(path.join(artifact, 'src', 'page', 'index.html'), '<h1>Docs</h1>\\n')
  writeFileSync(path.join(artifact, '.kooboo-artifact.json'), JSON.stringify({ schemaVersion: 1, sourceRepository: 'kb-docs', sourceCommit }) + '\\n')
} else if (command.includes('docs:deploy:kooboo:dry-run')) {
  mkdirSync(path.join(artifact, '.kooboo'), { recursive: true })
  writeFileSync(path.join(artifact, '.kooboo', 'deploy-plan.json'), JSON.stringify({
    source: { from: process.env.KOOBOO_DEPLOY_FROM, to: process.env.KOOBOO_DEPLOY_TO },
    expectedSite: { url: 'https://docs.example.com' },
    summary: { upsert: 2, delete: 0, skipped: 0 },
    planDigest: 'test-plan'
  }))
} else if (command.includes('docs:deploy:kooboo')) {
  writeFileSync(path.join(artifact, '.kooboo', 'deploy-receipt.json'), JSON.stringify({
    success: true, deploymentId: 'test-deployment', summary: { succeeded: 2, failed: 0, verified: 2, verificationFailed: 0 }
  }))
} else if (!command.includes('docs:verify:kooboo')) {
  process.exit(2)
}
`, 'utf8')
  await chmod(fakeCorepack, 0o755)

  const previousPath = process.env.PATH
  process.env.PATH = `${binDir}:${previousPath}`
  t.after(() => { process.env.PATH = previousPath })
  const updates = []
  const baselineFile = path.join(stateDir, 'baseline.json')
  const result = await runKoobooPublication({
    operationId: 'test-operation',
    sourceCommit,
    applyDeletes: false,
    projectRoot: sourceRoot,
    artifactDir,
    baselineFile,
    initialBaselineCommit,
    targetUrl: 'https://docs.example.com',
    verifyPaths: '/',
    update: async (status) => { updates.push(status); return status },
  })

  assert.equal(result.status, 'succeeded')
  assert.deepEqual(updates.map((item) => item.status), ['preparing', 'planning', 'deploying', 'verifying', 'succeeded'])
  const baseline = JSON.parse(await readFile(baselineFile, 'utf8'))
  assert.equal(baseline.sourceCommit, sourceCommit)
  assert.equal(baseline.targetUrl, 'https://docs.example.com')
  assert.notEqual(baseline.artifactCommit, initialBaselineCommit)
})
