import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { DocumentConflictError } from './docs-editor-draft.mjs'

import {
  EditorHttpError,
  createLocaleDocument,
  createDocsEditorServer,
  getDocumentLocales,
  normalizeDocumentPath,
  readDocument,
} from './docs-editor-server.mjs'

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  return `http://127.0.0.1:${address.port}`
}

async function close(server) {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
}

test('normalizeDocumentPath accepts docs Markdown and rejects unsafe paths', () => {
  assert.equal(normalizeDocumentPath('docs/index.md'), 'docs/index.md')
  assert.equal(normalizeDocumentPath('docs/en/api/index.md'), 'docs/en/api/index.md')

  for (const invalid of [
    '/docs/index.md',
    'docs/../README.md',
    'docs/.hidden/file.md',
    'docs/index.txt',
    'guides/setup.md',
    'docs\\index.md',
  ]) {
    assert.throws(() => normalizeDocumentPath(invalid), EditorHttpError)
  }
})

test('readDocument returns metadata and rejects symlink escapes', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-editor-read-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(path.join(root, 'docs', 'safe'), { recursive: true })
  await writeFile(path.join(root, 'docs', 'safe', 'page.md'), '# Safe\n', 'utf8')
  await writeFile(path.join(root, 'outside.md'), '# Outside\n', 'utf8')
  await symlink(path.join(root, 'outside.md'), path.join(root, 'docs', 'safe', 'escape.md'))

  const result = await readDocument(root, 'docs/safe/page.md')
  assert.equal(result.content, '# Safe\n')
  assert.equal(result.bytes, 7)
  assert.match(result.hash, /^[a-f0-9]{64}$/u)
  await assert.rejects(
    () => readDocument(root, 'docs/safe/escape.md'),
    /escapes the docs directory/u
  )
})

test('locale helpers report paired paths and create a missing translation draft', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-editor-locales-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(path.join(root, 'docs', 'quick-start'), { recursive: true })
  await writeFile(path.join(root, 'docs', 'quick-start', 'index.md'), '# 快速开始\n', 'utf8')
  const stateFile = path.join(root, 'preview', '.editor-draft.json')

  assert.deepEqual(await getDocumentLocales(root, 'docs/quick-start/index.md'), {
    active: 'zh',
    zh: { path: 'docs/quick-start/index.md', exists: true },
    en: { path: 'docs/en/quick-start/index.md', exists: false },
  })

  const created = await createLocaleDocument(root, 'docs/quick-start/index.md', 'en', stateFile)
  assert.equal(created.path, 'docs/en/quick-start/index.md')
  assert.equal(created.content, '# 快速开始\n')
  assert.equal(JSON.parse(await readFile(stateFile, 'utf8')).lastDocument, created.path)
  assert.equal((await getDocumentLocales(root, created.path)).en.exists, true)
  await assert.rejects(() => createLocaleDocument(root, created.path, 'en', stateFile), /already exists/u)
})

test('editor server authenticates, reads docs, proxies status, and serves the SPA', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-editor-server-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(path.join(root, 'docs'), { recursive: true })
  await mkdir(path.join(root, 'editor', 'dist', 'assets'), { recursive: true })
  await writeFile(path.join(root, 'docs', 'index.md'), '# Editor document\n', 'utf8')
  await writeFile(path.join(root, 'editor', 'dist', 'index.html'), '<div id="app"></div>', 'utf8')
  await writeFile(path.join(root, 'editor', 'dist', 'assets', 'app.js'), 'export {}', 'utf8')

  const previewServer = createServer((_request, response) => {
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ status: 'ready', releaseId: 'test-release' }))
  })
  const previewUrl = await listen(previewServer)
  t.after(() => close(previewServer))

  const editorServer = await createDocsEditorServer({
    authToken: 'editor-test-token-123',
    distDir: path.join(root, 'editor', 'dist'),
    fastPreviewBaseUrl: 'http://preview.example:4173',
    fastPreviewHealthUrl: previewUrl,
    stablePreviewBaseUrl: 'http://preview.example:4175',
    stablePreviewStatusUrl: previewUrl,
    projectRoot: root,
    draftCoordinator: {
      getStatus: () => ({ status: 'ready', queued: 0, releaseId: 'draft-release' }),
      async save(input) {
        if (input.expectedHash === '0'.repeat(64)) {
          throw new DocumentConflictError({
            path: 'docs/index.md',
            content: '# Server version\n',
            hash: '1'.repeat(64),
            bytes: 17,
            modifiedAt: new Date(0).toISOString(),
          })
        }
        return {
          document: { ...document, content: input.content, hash: '2'.repeat(64) },
          build: { status: 'not_requested', operationId: 'test-operation', scheduledAt: new Date(0).toISOString(), debounceMs: 0 },
        }
      },
      async build(input) {
        assert.equal(input.documentPath, 'docs/index.md')
        return { status: 'queued', operationId: 'test-build', scheduledAt: new Date(1).toISOString(), debounceMs: 0 }
      },
    },
    workspaceCoordinator: {
      async getStatus() { return { branch: 'main', remote: 'origin', remoteBranch: 'main', head: 'a'.repeat(40), fingerprint: 'b'.repeat(64), changedFiles: 1, stagedFiles: 0, outOfScopeFiles: 0, pendingPush: false, pendingPushCommit: null, ahead: 0, behind: 0, files: [{ path: 'docs/index.md', originalPath: null, status: 'modified', staged: false, additions: 1, deletions: 1, binary: false }] } },
      async getDiff(filePath) { return { path: filePath, binary: false, truncated: false, diff: '@@ -1 +1 @@\n-old\n+new\n' } },
      async getRecentCommits() { return [{ hash: 'c'.repeat(40), shortHash: 'ccccccc', author: 'Docs Studio', authoredAt: new Date(0).toISOString(), subject: 'docs: test' }] },
      async revert() { return { changedFiles: 0, files: [], fingerprint: 'd'.repeat(64) } },
      async commit() { return { branch: 'main', commit: 'e'.repeat(40), pushed: true, remote: 'origin', workspace: { changedFiles: 0, files: [] } } },
      async retryPush() { return { branch: 'main', commit: 'e'.repeat(40), pushed: true, remote: 'origin', workspace: { changedFiles: 0, files: [] } } },
    },
    mediaCoordinator: {
      async list() { return { items: [{ path: 'docs/public/cms/login.png', url: '/cms/login.png', name: 'login.png', bytes: 4, modifiedAt: new Date(0).toISOString() }], total: 1, page: 1, pageSize: 48, folders: ['cms'], roots: ['cms', 'product', 'en/cms', 'en/product'] } },
      async content() { return { body: Buffer.from([137, 80, 78, 71]), contentType: 'image/png' } },
      async references() { return { path: 'docs/public/cms/login.png', url: '/cms/login.png', references: [{ path: 'docs/index.md', line: 1 }] } },
      async upload(input) { assert.equal(input.directory, 'cms'); return { path: 'docs/public/cms/new.png', url: '/cms/new.png', name: 'new.png', bytes: 4, modifiedAt: new Date(0).toISOString() } },
    },
  })
  const editorUrl = await listen(editorServer)
  t.after(() => close(editorServer))

  const indexResponse = await fetch(`${editorUrl}/?path=docs%2Findex.md`)
  assert.equal(indexResponse.status, 200)
  assert.match(await indexResponse.text(), /id="app"/u)
  assert.match(indexResponse.headers.get('content-security-policy'), /frame-ancestors 'none'/u)
  assert.match(indexResponse.headers.get('content-security-policy'), /frame-src http:\/\/preview\.example:4173/u)

  const nestedSpaResponse = await fetch(`${editorUrl}/content/editor?path=docs%2Findex.md`)
  assert.equal(nestedSpaResponse.status, 200)
  assert.match(await nestedSpaResponse.text(), /id="app"/u)

  const unauthorized = await fetch(`${editorUrl}/api/document?path=docs%2Findex.md`)
  assert.equal(unauthorized.status, 401)

  const healthResponse = await fetch(`${editorUrl}/api/health`)
  assert.deepEqual(await healthResponse.json(), { status: 'ready', mode: 'draft' })

  const badLogin = await fetch(`${editorUrl}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'wrong-token' }),
  })
  assert.equal(badLogin.status, 401)

  const loginResponse = await fetch(`${editorUrl}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'editor-test-token-123' }),
  })
  assert.equal(loginResponse.status, 200)
  const cookie = loginResponse.headers.get('set-cookie')
  assert.match(cookie, /HttpOnly/u)
  assert.match(cookie, /SameSite=Strict/u)

  const authenticatedHeaders = { Cookie: cookie.split(';')[0] }
  const documentResponse = await fetch(`${editorUrl}/api/document?path=docs%2Findex.md`, {
    headers: authenticatedHeaders,
  })
  assert.equal(documentResponse.status, 200)
  const document = await documentResponse.json()
  assert.equal(document.path, 'docs/index.md')
  assert.equal(document.content, '# Editor document\n')

  const traversalResponse = await fetch(
    `${editorUrl}/api/document?path=${encodeURIComponent('docs/../README.md')}`,
    { headers: authenticatedHeaders }
  )
  assert.equal(traversalResponse.status, 400)

  const configResponse = await fetch(`${editorUrl}/api/config`, { headers: authenticatedHeaders })
  assert.deepEqual(await configResponse.json(), {
    mode: 'draft',
    allowedDocumentPattern: 'docs/**/*.md',
    maximumDocumentBytes: 2097152,
    maximumMediaBytes: 8388608,
    fastPreviewBaseUrl: 'http://preview.example:4173',
    stablePreviewBaseUrl: 'http://preview.example:4175',
    productionPublishAvailable: false,
  })

  const saveResponse = await fetch(`${editorUrl}/api/document`, {
    method: 'PUT',
    headers: { ...authenticatedHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: 'docs/index.md',
      content: '# Edited document\n',
      expectedHash: document.hash,
    }),
  })
  assert.equal(saveResponse.status, 200)
  assert.deepEqual((await saveResponse.json()).build, {
    status: 'not_requested',
    operationId: 'test-operation',
    scheduledAt: new Date(0).toISOString(),
    debounceMs: 0,
  })

  const buildResponse = await fetch(`${editorUrl}/api/build`, {
    method: 'POST',
    headers: { ...authenticatedHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'docs/index.md' }),
  })
  assert.equal(buildResponse.status, 202)
  assert.deepEqual(await buildResponse.json(), {
    status: 'queued',
    operationId: 'test-build',
    scheduledAt: new Date(1).toISOString(),
    debounceMs: 0,
  })

  const conflictResponse = await fetch(`${editorUrl}/api/document`, {
    method: 'PUT',
    headers: { ...authenticatedHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: 'docs/index.md',
      content: '# Stale edit\n',
      expectedHash: '0'.repeat(64),
    }),
  })
  assert.equal(conflictResponse.status, 409)
  const conflict = await conflictResponse.json()
  assert.equal(conflict.code, 'DOCUMENT_CONFLICT')
  assert.equal(conflict.document.content, '# Server version\n')

  const buildStatusResponse = await fetch(`${editorUrl}/api/build-status`, {
    headers: authenticatedHeaders,
  })
  assert.equal(buildStatusResponse.status, 200)
  assert.equal((await buildStatusResponse.json()).releaseId, 'draft-release')

  const mediaResponse = await fetch(`${editorUrl}/api/media?root=cms`, { headers: authenticatedHeaders })
  assert.equal((await mediaResponse.json()).items[0].url, '/cms/login.png')
  const mediaContentResponse = await fetch(`${editorUrl}/api/media/content?path=docs%2Fpublic%2Fcms%2Flogin.png`, { headers: authenticatedHeaders })
  assert.equal(mediaContentResponse.headers.get('content-type'), 'image/png')
  assert.deepEqual(Buffer.from(await mediaContentResponse.arrayBuffer()), Buffer.from([137, 80, 78, 71]))
  const referencesResponse = await fetch(`${editorUrl}/api/media/references?path=docs%2Fpublic%2Fcms%2Flogin.png`, { headers: authenticatedHeaders })
  assert.equal((await referencesResponse.json()).references[0].path, 'docs/index.md')
  const uploadResponse = await fetch(`${editorUrl}/api/media/upload`, {
    method: 'POST', headers: { ...authenticatedHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ directory: 'cms', fileName: 'new.png', contentBase64: 'iVBORw0KGgo=' }),
  })
  assert.equal(uploadResponse.status, 201)
  assert.equal((await uploadResponse.json()).url, '/cms/new.png')

  const workspaceResponse = await fetch(`${editorUrl}/api/workspace`, { headers: authenticatedHeaders })
  assert.equal((await workspaceResponse.json()).changedFiles, 1)
  const diffResponse = await fetch(`${editorUrl}/api/workspace/diff?path=docs%2Findex.md`, { headers: authenticatedHeaders })
  assert.match((await diffResponse.json()).diff, /\+new/u)
  const commitsResponse = await fetch(`${editorUrl}/api/workspace/commits`, { headers: authenticatedHeaders })
  assert.equal((await commitsResponse.json()).commits[0].shortHash, 'ccccccc')
  const revertResponse = await fetch(`${editorUrl}/api/workspace/revert`, {
    method: 'POST', headers: { ...authenticatedHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths: ['docs/index.md'], expectedFingerprint: 'b'.repeat(64) }),
  })
  assert.equal((await revertResponse.json()).changedFiles, 0)
  const commitResponse = await fetch(`${editorUrl}/api/workspace/commit`, {
    method: 'POST', headers: { ...authenticatedHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'docs: test', expectedFingerprint: 'b'.repeat(64) }),
  })
  assert.equal(commitResponse.status, 201)
  assert.equal((await commitResponse.json()).pushed, true)

  const statusResponse = await fetch(`${editorUrl}/api/preview-status`, {
    headers: authenticatedHeaders,
  })
  assert.equal(statusResponse.status, 200)
  assert.deepEqual(await statusResponse.json(), {
    fast: { available: true },
    stable: {
      available: true,
      status: { status: 'ready', releaseId: 'test-release' },
    },
  })
})
