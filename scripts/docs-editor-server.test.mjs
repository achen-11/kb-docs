import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { DocumentConflictError } from './docs-editor-draft.mjs'

import {
  EditorHttpError,
  createDocsEditorServer,
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
          build: { status: 'queued', operationId: 'test-operation', scheduledAt: new Date(0).toISOString(), debounceMs: 8000 },
        }
      },
    },
  })
  const editorUrl = await listen(editorServer)
  t.after(() => close(editorServer))

  const indexResponse = await fetch(`${editorUrl}/?path=docs%2Findex.md`)
  assert.equal(indexResponse.status, 200)
  assert.match(await indexResponse.text(), /id="app"/u)
  assert.match(indexResponse.headers.get('content-security-policy'), /frame-ancestors 'none'/u)
  assert.match(indexResponse.headers.get('content-security-policy'), /frame-src http:\/\/preview\.example:4173/u)

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
    fastPreviewBaseUrl: 'http://preview.example:4173',
    stablePreviewBaseUrl: 'http://preview.example:4175',
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
    status: 'queued',
    operationId: 'test-operation',
    scheduledAt: new Date(0).toISOString(),
    debounceMs: 8000,
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
