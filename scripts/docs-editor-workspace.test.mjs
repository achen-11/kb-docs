import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

import { WorkspaceOperationError, createWorkspaceCoordinator } from './docs-editor-workspace.mjs'

const execFileAsync = promisify(execFile)

async function git(cwd, args) {
  return execFileAsync('git', args, { cwd, encoding: 'utf8' })
}

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-workspace-'))
  const remote = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-workspace-remote-'))
  const previewRoot = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-workspace-preview-'))
  await mkdir(path.join(root, 'docs'), { recursive: true })
  await writeFile(path.join(root, 'docs', 'index.md'), '# Initial\n', 'utf8')
  await writeFile(path.join(root, 'README.md'), '# Repository\n', 'utf8')
  await git(root, ['init', '-b', 'main'])
  await git(root, ['config', 'user.email', 'fixture@example.invalid'])
  await git(root, ['config', 'user.name', 'Fixture'])
  await git(root, ['add', '.'])
  await git(root, ['commit', '-m', 'initial'])
  await git(remote, ['init', '--bare'])
  await git(root, ['remote', 'add', 'origin', remote])
  await git(root, ['push', '-u', 'origin', 'main'])
  const coordinator = createWorkspaceCoordinator({
    projectRoot: root,
    draftStateFile: path.join(previewRoot, '.editor-draft.json'),
    auditLog: path.join(previewRoot, 'audit.jsonl'),
    lockFile: path.join(previewRoot, '.update.lock'),
    gitRemote: 'origin',
    gitBranch: 'main',
  })
  return { coordinator, previewRoot, remote, root }
}

test('workspace coordinator lists docs changes, returns diff, and safely reverts selected files', async (t) => {
  const fixture = await createFixture()
  t.after(() => Promise.all([
    rm(fixture.root, { recursive: true, force: true }),
    rm(fixture.remote, { recursive: true, force: true }),
    rm(fixture.previewRoot, { recursive: true, force: true }),
  ]))
  await writeFile(path.join(fixture.root, 'docs', 'index.md'), '# Edited\n', 'utf8')
  await writeFile(path.join(fixture.root, 'docs', 'new.md'), '# New\n', 'utf8')
  await writeFile(path.join(fixture.previewRoot, '.editor-draft.json'), '{"active":true}\n', 'utf8')

  const status = await fixture.coordinator.getStatus()
  assert.equal(status.changedFiles, 2)
  assert.equal(status.outOfScopeFiles, 0)
  assert.match(status.fingerprint, /^[a-f0-9]{64}$/u)
  assert.deepEqual(status.files.map((file) => file.status), ['modified', 'untracked'])

  const diff = await fixture.coordinator.getDiff('docs/index.md')
  assert.match(diff.diff, /-# Initial/u)
  assert.match(diff.diff, /\+# Edited/u)

  const afterOne = await fixture.coordinator.revert({
    actor: 'test',
    paths: ['docs/new.md'],
    expectedFingerprint: status.fingerprint,
  })
  assert.equal(afterOne.changedFiles, 1)
  await assert.rejects(() => readFile(path.join(fixture.root, 'docs', 'new.md')), { code: 'ENOENT' })

  const clean = await fixture.coordinator.revert({
    actor: 'test',
    paths: [],
    expectedFingerprint: afterOne.fingerprint,
  })
  assert.equal(clean.changedFiles, 0)
  assert.equal(await readFile(path.join(fixture.root, 'docs', 'index.md'), 'utf8'), '# Initial\n')
  await assert.rejects(() => readFile(path.join(fixture.previewRoot, '.editor-draft.json')), { code: 'ENOENT' })
})

test('workspace coordinator commits only docs changes and pushes the configured branch', async (t) => {
  const fixture = await createFixture()
  t.after(() => Promise.all([
    rm(fixture.root, { recursive: true, force: true }),
    rm(fixture.remote, { recursive: true, force: true }),
    rm(fixture.previewRoot, { recursive: true, force: true }),
  ]))
  await writeFile(path.join(fixture.root, 'docs', 'index.md'), '# Submitted\n', 'utf8')
  await writeFile(path.join(fixture.previewRoot, '.editor-draft.json'), '{"active":true}\n', 'utf8')
  const status = await fixture.coordinator.getStatus()
  const result = await fixture.coordinator.commit({
    actor: 'test',
    expectedFingerprint: status.fingerprint,
    message: 'docs: update introduction',
  })
  assert.equal(result.pushed, true)
  assert.match(result.commit, /^[a-f0-9]{40}$/u)
  assert.equal((await git(fixture.remote, ['rev-parse', 'refs/heads/main'])).stdout.trim(), result.commit)
  assert.equal(result.workspace.changedFiles, 0)
  assert.equal(result.workspace.ahead, 0)
  await assert.rejects(() => readFile(path.join(fixture.previewRoot, '.editor-draft.json')), { code: 'ENOENT' })
  assert.match(await readFile(path.join(fixture.previewRoot, 'audit.jsonl'), 'utf8'), /workspace_pushed/u)
})

test('workspace coordinator refuses stale, staged, and out-of-scope mutations', async (t) => {
  const fixture = await createFixture()
  t.after(() => Promise.all([
    rm(fixture.root, { recursive: true, force: true }),
    rm(fixture.remote, { recursive: true, force: true }),
    rm(fixture.previewRoot, { recursive: true, force: true }),
  ]))
  await writeFile(path.join(fixture.root, 'docs', 'index.md'), '# Edited\n', 'utf8')
  const status = await fixture.coordinator.getStatus()
  await writeFile(path.join(fixture.root, 'docs', 'index.md'), '# Changed again\n', 'utf8')
  await assert.rejects(
    () => fixture.coordinator.revert({ actor: 'test', paths: [], expectedFingerprint: status.fingerprint }),
    (error) => error instanceof WorkspaceOperationError && error.code === 'WORKSPACE_CHANGED'
  )

  await git(fixture.root, ['add', 'docs/index.md'])
  const staged = await fixture.coordinator.getStatus()
  await assert.rejects(
    () => fixture.coordinator.commit({ actor: 'test', expectedFingerprint: staged.fingerprint, message: 'docs: staged change' }),
    (error) => error instanceof WorkspaceOperationError && error.code === 'STAGED_CHANGES_PRESENT'
  )
  await git(fixture.root, ['reset', '--mixed', 'HEAD'])
  await writeFile(path.join(fixture.root, 'README.md'), '# Outside edit\n', 'utf8')
  const outside = await fixture.coordinator.getStatus()
  await assert.rejects(
    () => fixture.coordinator.commit({ actor: 'test', expectedFingerprint: outside.fingerprint, message: 'docs: blocked change' }),
    (error) => error instanceof WorkspaceOperationError && error.code === 'OUT_OF_SCOPE_CHANGES'
  )
})

test('workspace coordinator preserves a committed version after push failure and retries safely', async (t) => {
  const fixture = await createFixture()
  t.after(() => Promise.all([
    rm(fixture.root, { recursive: true, force: true }),
    rm(fixture.remote, { recursive: true, force: true }),
    rm(fixture.previewRoot, { recursive: true, force: true }),
  ]))
  await writeFile(path.join(fixture.root, 'docs', 'index.md'), '# Pending push\n', 'utf8')
  const status = await fixture.coordinator.getStatus()
  await git(fixture.root, ['remote', 'set-url', 'origin', path.join(fixture.root, 'missing-remote.git')])
  let committedHash
  await assert.rejects(
    () => fixture.coordinator.commit({ actor: 'test', expectedFingerprint: status.fingerprint, message: 'docs: keep pending push' }),
    (error) => {
      committedHash = error.details.commit
      return error instanceof WorkspaceOperationError && error.code === 'GIT_PUSH_FAILED'
    }
  )
  const pending = await fixture.coordinator.getStatus()
  assert.equal(pending.changedFiles, 0)
  assert.equal(pending.pendingPush, true)
  assert.equal(pending.pendingPushCommit, committedHash)
  assert.equal(pending.head, committedHash)

  await writeFile(path.join(fixture.root, 'docs', 'index.md'), '# Second edit\n', 'utf8')
  const secondEdit = await fixture.coordinator.getStatus()
  await assert.rejects(
    () => fixture.coordinator.commit({ actor: 'test', expectedFingerprint: secondEdit.fingerprint, message: 'docs: must wait for push' }),
    (error) => error instanceof WorkspaceOperationError && error.code === 'PENDING_PUSH_EXISTS'
  )
  await git(fixture.root, ['restore', '--source=HEAD', '--worktree', '--', 'docs/index.md'])

  await git(fixture.root, ['remote', 'set-url', 'origin', fixture.remote])
  const pushed = await fixture.coordinator.retryPush({ actor: 'test' })
  assert.equal(pushed.commit, committedHash)
  assert.equal(pushed.workspace.pendingPush, false)
  assert.equal((await git(fixture.remote, ['rev-parse', 'refs/heads/main'])).stdout.trim(), committedHash)
})
