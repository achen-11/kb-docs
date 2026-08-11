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

test('draft coordinator serializes saves, builds previews, writes audit, and manages the draft marker', async (t) => {
  const fixture = await createFixture()
  t.after(() => rm(fixture.root, { recursive: true, force: true }))
  const buildLog = path.join(fixture.root, 'build.log')
  const buildStub = path.join(fixture.root, 'build-stub.mjs')
  await writeFile(
    buildStub,
    `import { appendFile, writeFile } from 'node:fs/promises';\n` +
      `const [log,status]=process.argv.slice(2);\n` +
      `await appendFile(log,'start\\n'); await new Promise(r=>setTimeout(r,40)); await appendFile(log,'end\\n');\n` +
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
  assert.equal(one.build.releaseId, 'draft-release')
  assert.equal(two.build.status, 'ready')
  assert.equal(await readFile(buildLog, 'utf8'), 'start\nend\nstart\nend\n')
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
    buildCommand: { command: process.execPath, args: ['-e', 'process.exit(9)'] },
    normalizeDocumentPath: (value) => value,
    readDocument: async () => null,
  })
  const result = await coordinator.save({
    actor: 'test', documentPath: 'docs/one.md', content: '# Saved despite failure\n', expectedHash: hashContent('# One\n'),
  })
  assert.equal(result.build.status, 'error')
  assert.match(result.build.error, /exited with code 9/u)
  assert.equal(await readFile(path.join(fixture.root, 'docs', 'one.md'), 'utf8'), '# Saved despite failure\n')
})
