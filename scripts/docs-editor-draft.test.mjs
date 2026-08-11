import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

import {
  DocumentConflictError,
  createDraftCoordinator,
  writeDocumentAtomically,
} from './docs-editor-draft.mjs'

const execFileAsync = promisify(execFile)

async function git(cwd, args) {
  return execFileAsync('git', args, { cwd, encoding: 'utf8' })
}

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-editor-draft-'))
  const previewRoot = path.join(root, 'preview')
  await mkdir(path.join(root, 'docs'), { recursive: true })
  await mkdir(previewRoot, { recursive: true })
  await writeFile(path.join(root, 'docs', 'one.md'), '# One\n', 'utf8')
  await writeFile(path.join(root, 'docs', 'two.md'), '# Two\n', 'utf8')
  await git(root, ['init', '-b', 'main'])
  await git(root, ['config', 'user.email', 'editor-test@example.invalid'])
  await git(root, ['config', 'user.name', 'Editor Test'])
  await git(root, ['add', 'docs'])
  await git(root, ['commit', '-m', 'initial'])
  return { root, previewRoot }
}

function metadata(documentPath, content) {
  const hash = hashContent(content)
  return { path: documentPath, content, hash, bytes: Buffer.byteLength(content), modifiedAt: new Date().toISOString() }
}

function hashContent(content) {
  return createHash('sha256').update(content).digest('hex')
}

test('writeDocumentAtomically checks hashes, preserves permissions, and rejects invalid content', async (t) => {
  const fixture = await createFixture()
  t.after(() => rm(fixture.root, { recursive: true, force: true }))
  const filePath = path.join(fixture.root, 'docs', 'one.md')
  await chmod(filePath, 0o640)
  const expectedHash = hashContent('# One\n')

  const saved = await writeDocumentAtomically({
    projectRoot: fixture.root,
    documentPath: 'docs/one.md',
    content: '# Updated\n',
    expectedHash,
  })
  assert.equal(saved.content, '# Updated\n')
  assert.equal((await stat(filePath)).mode & 0o777, 0o640)

  await assert.rejects(
    () => writeDocumentAtomically({
      projectRoot: fixture.root,
      documentPath: 'docs/one.md',
      content: '# Stale\n',
      expectedHash,
    }),
    DocumentConflictError
  )
  await assert.rejects(
    () => writeDocumentAtomically({
      projectRoot: fixture.root,
      documentPath: 'docs/one.md',
      content: 'bad\0content',
      expectedHash: saved.hash,
    }),
    /NUL/u
  )
  assert.equal(await readFile(filePath, 'utf8'), '# Updated\n')
})

test('draft coordinator returns after atomic saves and coalesces background stable builds', async (t) => {
  const fixture = await createFixture()
  t.after(() => rm(fixture.root, { recursive: true, force: true }))
  const buildLog = path.join(fixture.root, 'build.log')
  const buildStub = path.join(fixture.root, 'build-stub.mjs')
  await writeFile(
    buildStub,
    `import { appendFile, writeFile } from 'node:fs/promises';\n` +
      `const [log,status]=process.argv.slice(2);\n` +
      `await appendFile(log,'start\\n'); await new Promise(r=>setTimeout(r,80)); await appendFile(log,'end\\n');\n` +
      `await writeFile(status,JSON.stringify({status:'ready',releaseId:'draft-release'})+'\\n');\n`,
    'utf8'
  )
  const draftStateFile = path.join(fixture.previewRoot, '.editor-draft.json')
  const auditLog = path.join(fixture.previewRoot, 'editor-audit.jsonl')
  const coordinator = createDraftCoordinator({
    projectRoot: fixture.root,
    previewRoot: fixture.previewRoot,
    previewEnvFile: path.join(fixture.root, 'unused.env'),
    draftStateFile,
    auditLog,
    lockFile: path.join(fixture.previewRoot, '.update.lock'),
    buildDebounceMs: 100,
    buildCommand: {
      command: process.execPath,
      args: [buildStub, buildLog, path.join(fixture.previewRoot, '.preview-status.json')],
    },
    normalizeDocumentPath: (value) => value,
    readDocument: async (_root, documentPath) => metadata(documentPath, await readFile(path.join(fixture.root, documentPath), 'utf8')),
  })

  const [one, two] = await Promise.all([
    coordinator.save({
      actor: 'test', documentPath: 'docs/one.md', content: '# One edited\n', expectedHash: hashContent('# One\n'),
    }),
    coordinator.save({
      actor: 'test', documentPath: 'docs/two.md', content: '# Two edited\n', expectedHash: hashContent('# Two\n'),
    }),
  ])
  assert.equal(one.build.status, 'queued')
  assert.equal(two.build.status, 'queued')
  await assert.rejects(() => readFile(buildLog, 'utf8'), { code: 'ENOENT' })
  await coordinator.waitForIdle()
  assert.equal(await readFile(buildLog, 'utf8'), 'start\nend\n')
  assert.equal(coordinator.getStatus().status, 'ready')
  assert.equal(coordinator.getStatus().releaseId, 'draft-release')
  assert.equal(JSON.parse(await readFile(draftStateFile, 'utf8')).active, true)
  assert.match(await readFile(auditLog, 'utf8'), /"outcome":"preview_ready"/u)

  const currentOne = await readFile(path.join(fixture.root, 'docs', 'one.md'), 'utf8')
  const currentTwo = await readFile(path.join(fixture.root, 'docs', 'two.md'), 'utf8')
  await coordinator.save({
    actor: 'test', documentPath: 'docs/one.md', content: '# One\n', expectedHash: hashContent(currentOne),
  })
  await coordinator.save({
    actor: 'test', documentPath: 'docs/two.md', content: '# Two\n', expectedHash: hashContent(currentTwo),
  })
  await coordinator.waitForIdle()
  assert.equal(await readFile(buildLog, 'utf8'), 'start\nend\nstart\nend\n')
  await assert.rejects(() => readFile(draftStateFile, 'utf8'), { code: 'ENOENT' })
})

test('draft coordinator keeps a saved document when preview build fails', async (t) => {
  const fixture = await createFixture()
  t.after(() => rm(fixture.root, { recursive: true, force: true }))
  const coordinator = createDraftCoordinator({
    projectRoot: fixture.root,
    previewRoot: fixture.previewRoot,
    previewEnvFile: path.join(fixture.root, 'unused.env'),
    lockFile: path.join(fixture.previewRoot, '.update.lock'),
    buildDebounceMs: 10,
    buildCommand: { command: process.execPath, args: ['-e', 'process.exit(9)'] },
    normalizeDocumentPath: (value) => value,
    readDocument: async () => null,
  })
  const result = await coordinator.save({
    actor: 'test', documentPath: 'docs/one.md', content: '# Saved despite failure\n', expectedHash: hashContent('# One\n'),
  })
  assert.equal(result.build.status, 'queued')
  assert.equal(await readFile(path.join(fixture.root, 'docs', 'one.md'), 'utf8'), '# Saved despite failure\n')
  await coordinator.waitForIdle()
  assert.equal(coordinator.getStatus().status, 'error')
  assert.match(coordinator.getStatus().error, /exited with code 9/u)
})

test('a newer save supersedes an active stable build instead of waiting for it', async (t) => {
  const fixture = await createFixture()
  t.after(() => rm(fixture.root, { recursive: true, force: true }))
  const buildStub = path.join(fixture.root, 'slow-build.mjs')
  const buildLog = path.join(fixture.root, 'slow-build.log')
  await writeFile(
    buildStub,
    `import { appendFile, writeFile } from 'node:fs/promises';\n` +
      `const [log,status]=process.argv.slice(2); await appendFile(log,'start\\n');\n` +
      `await new Promise(r=>setTimeout(r,5000)); await writeFile(status,JSON.stringify({releaseId:'latest'})+'\\n');\n`,
    'utf8'
  )
  const coordinator = createDraftCoordinator({
    projectRoot: fixture.root,
    previewRoot: fixture.previewRoot,
    previewEnvFile: path.join(fixture.root, 'unused.env'),
    lockFile: path.join(fixture.previewRoot, '.update.lock'),
    auditLog: path.join(fixture.previewRoot, 'editor-audit.jsonl'),
    buildDebounceMs: 10,
    buildCommand: {
      command: process.execPath,
      args: [buildStub, buildLog, path.join(fixture.previewRoot, '.preview-status.json')],
    },
    normalizeDocumentPath: (value) => value,
    readDocument: async () => null,
  })
  const first = await coordinator.save({
    actor: 'test', documentPath: 'docs/one.md', content: '# First\n', expectedHash: hashContent('# One\n'),
  })
  assert.equal(first.build.status, 'queued')
  while (coordinator.getStatus().status !== 'building') {
    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  const startedAt = Date.now()
  const second = await coordinator.save({
    actor: 'test', documentPath: 'docs/one.md', content: '# Second\n', expectedHash: first.document.hash,
  })
  assert.equal(second.build.status, 'queued')
  assert.ok(Date.now() - startedAt < 2500)
  await coordinator.waitForIdle()
  assert.equal(coordinator.getStatus().status, 'ready')
  assert.match(await readFile(path.join(fixture.previewRoot, 'editor-audit.jsonl'), 'utf8'), /preview_superseded/u)
})
