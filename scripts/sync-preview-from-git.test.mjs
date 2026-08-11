import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

import { syncPreviewFromGit } from './sync-preview-from-git.mjs'

const execFileAsync = promisify(execFile)

async function git(cwd, args) {
  return execFileAsync('git', args, { cwd, encoding: 'utf-8' })
}

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-git-sync-'))
  const remoteDir = path.join(root, 'remote.git')
  const seedDir = path.join(root, 'seed')
  const checkoutDir = path.join(root, 'checkout')
  const stateFile = path.join(root, 'preview-data', 'git-sync-state.json')
  const lockFile = path.join(root, 'preview-data', 'update.lock')
  const updateLog = path.join(root, 'update.log')
  const updateStub = path.join(root, 'update-stub.mjs')

  await git(root, ['init', '--bare', remoteDir])
  await git(root, ['init', '-b', 'main', seedDir])
  await git(seedDir, ['config', 'user.email', 'preview-test@example.invalid'])
  await git(seedDir, ['config', 'user.name', 'Preview Test'])
  await writeFile(path.join(seedDir, 'package.json'), '{"name":"preview-test"}\n', 'utf-8')
  await writeFile(path.join(seedDir, 'document.md'), '# Version 1\n', 'utf-8')
  await mkdir(path.join(seedDir, 'docs'))
  await writeFile(path.join(seedDir, 'docs', 'page.md'), '# Draft page\n', 'utf-8')
  await git(seedDir, ['add', 'package.json', 'document.md', 'docs/page.md'])
  await git(seedDir, ['commit', '-m', 'initial'])
  await git(seedDir, ['remote', 'add', 'origin', remoteDir])
  await git(seedDir, ['push', '-u', 'origin', 'main'])
  await git(root, ['clone', '--branch', 'main', remoteDir, checkoutDir])
  await git(checkoutDir, ['config', 'user.email', 'preview-test@example.invalid'])
  await git(checkoutDir, ['config', 'user.name', 'Preview Test'])
  await writeFile(
    updateStub,
    "import { appendFileSync } from 'node:fs'; appendFileSync(process.argv[2], 'publish\\n');\n",
    'utf-8'
  )

  return {
    checkoutDir,
    lockFile,
    draftStateFile: path.join(root, 'preview-data', 'editor-draft.json'),
    remoteDir,
    root,
    seedDir,
    stateFile,
    updateCommand: { command: process.execPath, args: [updateStub, updateLog] },
    updateLog
  }
}

async function countPublishes(logFile) {
  try {
    return (await readFile(logFile, 'utf-8')).trim().split('\n').filter(Boolean).length
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return 0
    throw error
  }
}

test('Git preview sync publishes once, fast-forwards new commits, and no-ops after success', async () => {
  const fixture = await createFixture()
  try {
    const first = await syncPreviewFromGit({
      appDir: fixture.checkoutDir,
      branch: 'main',
      lockFile: fixture.lockFile,
      remote: 'origin',
      stateFile: fixture.stateFile,
      updateCommand: fixture.updateCommand
    })
    assert.equal(first.published, true)
    assert.equal(first.changed, false)
    assert.equal(await countPublishes(fixture.updateLog), 1)

    const noChange = await syncPreviewFromGit({
      appDir: fixture.checkoutDir,
      branch: 'main',
      lockFile: fixture.lockFile,
      remote: 'origin',
      stateFile: fixture.stateFile,
      updateCommand: fixture.updateCommand
    })
    assert.equal(noChange.published, false)
    assert.equal(await countPublishes(fixture.updateLog), 1)

    await writeFile(path.join(fixture.seedDir, 'document.md'), '# Version 2\n', 'utf-8')
    await git(fixture.seedDir, ['add', 'document.md'])
    await git(fixture.seedDir, ['commit', '-m', 'update'])
    await git(fixture.seedDir, ['push', 'origin', 'main'])

    const updated = await syncPreviewFromGit({
      appDir: fixture.checkoutDir,
      branch: 'main',
      lockFile: fixture.lockFile,
      remote: 'origin',
      stateFile: fixture.stateFile,
      updateCommand: fixture.updateCommand
    })
    assert.equal(updated.changed, true)
    assert.equal(updated.published, true)
    assert.equal(await readFile(path.join(fixture.checkoutDir, 'document.md'), 'utf-8'), '# Version 2\n')
    assert.equal(await countPublishes(fixture.updateLog), 2)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('Git preview sync retries an unpublished commit and does not advance state after failure', async () => {
  const fixture = await createFixture()
  try {
    await assert.rejects(
      () =>
        syncPreviewFromGit({
          appDir: fixture.checkoutDir,
          branch: 'main',
          lockFile: fixture.lockFile,
          remote: 'origin',
          stateFile: fixture.stateFile,
          updateCommand: { command: process.execPath, args: ['-e', 'process.exit(12)'] }
        }),
      /exited with code 12/u
    )
    await assert.rejects(() => readFile(fixture.stateFile, 'utf-8'), { code: 'ENOENT' })

    const retry = await syncPreviewFromGit({
      appDir: fixture.checkoutDir,
      branch: 'main',
      lockFile: fixture.lockFile,
      remote: 'origin',
      stateFile: fixture.stateFile,
      updateCommand: fixture.updateCommand
    })
    assert.equal(retry.published, true)
    assert.equal(await countPublishes(fixture.updateLog), 1)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('Git preview sync refuses dirty and non-fast-forward worktrees', async () => {
  const fixture = await createFixture()
  try {
    await writeFile(path.join(fixture.checkoutDir, 'document.md'), '# Local dirty change\n', 'utf-8')
    await assert.rejects(
      () =>
        syncPreviewFromGit({
          appDir: fixture.checkoutDir,
          branch: 'main',
          lockFile: fixture.lockFile,
          remote: 'origin',
          stateFile: fixture.stateFile,
          updateCommand: fixture.updateCommand
        }),
      /worktree is dirty/u
    )

    await git(fixture.checkoutDir, ['restore', 'document.md'])
    await writeFile(path.join(fixture.checkoutDir, 'local-only.md'), '# Local only\n', 'utf-8')
    await git(fixture.checkoutDir, ['add', 'local-only.md'])
    await git(fixture.checkoutDir, ['commit', '-m', 'local only'])

    await writeFile(path.join(fixture.seedDir, 'remote-only.md'), '# Remote only\n', 'utf-8')
    await git(fixture.seedDir, ['add', 'remote-only.md'])
    await git(fixture.seedDir, ['commit', '-m', 'remote only'])
    await git(fixture.seedDir, ['push', 'origin', 'main'])

    await assert.rejects(
      () =>
        syncPreviewFromGit({
          appDir: fixture.checkoutDir,
          branch: 'main',
          lockFile: fixture.lockFile,
          remote: 'origin',
          stateFile: fixture.stateFile,
          updateCommand: fixture.updateCommand
        }),
      /Refusing non-fast-forward/u
    )
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('Git preview sync defers active editor drafts before fetching and removes stale markers', async () => {
  const fixture = await createFixture()
  try {
    await writeFile(path.join(fixture.checkoutDir, 'docs', 'page.md'), '# Active draft\n', 'utf8')
    await mkdir(path.dirname(fixture.draftStateFile), { recursive: true })
    await writeFile(fixture.draftStateFile, '{"active":true}\n', 'utf8')

    const deferred = await syncPreviewFromGit({
      appDir: fixture.checkoutDir,
      branch: 'main',
      draftStateFile: fixture.draftStateFile,
      lockFile: fixture.lockFile,
      remote: 'origin',
      stateFile: fixture.stateFile,
      updateCommand: fixture.updateCommand
    })
    assert.deepEqual(deferred, {
      changed: false,
      deferred: true,
      published: false,
      reason: 'editor_draft'
    })
    assert.equal(await countPublishes(fixture.updateLog), 0)

    await git(fixture.checkoutDir, ['restore', 'docs/page.md'])
    const resumed = await syncPreviewFromGit({
      appDir: fixture.checkoutDir,
      branch: 'main',
      draftStateFile: fixture.draftStateFile,
      lockFile: fixture.lockFile,
      remote: 'origin',
      stateFile: fixture.stateFile,
      updateCommand: fixture.updateCommand
    })
    assert.equal(resumed.published, true)
    await assert.rejects(() => readFile(fixture.draftStateFile, 'utf8'), { code: 'ENOENT' })
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})
