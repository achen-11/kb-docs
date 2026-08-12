import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { MediaOperationError, createMediaCoordinator, normalizeMediaDirectory, normalizeMediaPath } from './docs-editor-media.mjs'

const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-editor-media-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(path.join(root, 'docs/public/cms/getting-started'), { recursive: true })
  await mkdir(path.join(root, 'docs/public/product'), { recursive: true })
  await mkdir(path.join(root, 'docs/en'), { recursive: true })
  await writeFile(path.join(root, 'docs/index.md'), '<DocImage src="/cms/getting-started/login.png" alt="登录" />\n', 'utf8')
  await writeFile(path.join(root, 'docs/public/cms/getting-started/login.png'), Buffer.from(pngBase64, 'base64'))
  const previewRoot = path.join(root, 'preview')
  return {
    root,
    previewRoot,
    coordinator: createMediaCoordinator({
      projectRoot: root,
      draftStateFile: path.join(previewRoot, '.editor-draft.json'),
      auditLog: path.join(previewRoot, 'editor-audit.jsonl'),
      lockFile: path.join(previewRoot, '.update.lock'),
      maximumBytes: 1024,
    }),
  }
}

test('media paths accept controlled roots and reject traversal or unsupported files', () => {
  assert.equal(normalizeMediaDirectory('cms/getting-started'), 'cms/getting-started')
  assert.equal(normalizeMediaDirectory('en/product/console'), 'en/product/console')
  assert.equal(normalizeMediaPath('docs/public/cms/getting-started/login.png'), 'docs/public/cms/getting-started/login.png')
  for (const invalid of ['home', '../cms', 'cms/.hidden', 'docs/public/home/logo.png', 'docs/public/cms/icon.svg', 'docs\\public\\cms\\x.png']) {
    const operation = invalid.startsWith('docs/') || invalid.includes('\\') ? () => normalizeMediaPath(invalid) : () => normalizeMediaDirectory(invalid)
    assert.throws(operation, MediaOperationError)
  }
})

test('media list is paginated and references report Markdown locations', async (t) => {
  const { coordinator } = await fixture(t)
  const list = await coordinator.list({ root: 'cms', search: 'login', page: 1, pageSize: 12 })
  assert.equal(list.total, 1)
  assert.equal(list.items[0].url, '/cms/getting-started/login.png')
  const references = await coordinator.references(list.items[0].path)
  assert.deepEqual(references.references, [{ path: 'docs/index.md', line: 1 }])
  const media = await coordinator.content(list.items[0].path)
  assert.equal(media.contentType, 'image/png')
  assert.ok(media.body.length > 0)
})

test('media upload writes a new draft atomically and rejects conflicts and disguised data', async (t) => {
  const { coordinator, root, previewRoot } = await fixture(t)
  const saved = await coordinator.upload({ directory: 'product', fileName: 'hero.png', contentBase64: pngBase64, actor: 'test' })
  assert.equal(saved.path, 'docs/public/product/hero.png')
  assert.deepEqual(await readFile(path.join(root, saved.path)), Buffer.from(pngBase64, 'base64'))
  const marker = JSON.parse(await readFile(path.join(previewRoot, '.editor-draft.json'), 'utf8'))
  assert.equal(marker.active, true)
  assert.equal(marker.lastAsset, saved.path)
  await assert.rejects(() => coordinator.upload({ directory: 'product', fileName: 'hero.png', contentBase64: pngBase64, actor: 'test' }), (error) => error.code === 'MEDIA_EXISTS')
  await assert.rejects(() => coordinator.upload({ directory: 'product', fileName: 'fake.png', contentBase64: Buffer.from('not an image').toString('base64'), actor: 'test' }), (error) => error.code === 'MEDIA_TYPE_MISMATCH')
})

test('media upload refuses a writable directory that escapes through a symlink', async (t) => {
  const { coordinator, root } = await fixture(t)
  const outside = path.join(root, 'outside')
  await mkdir(outside)
  await symlink(outside, path.join(root, 'docs/public/cms/escape'))
  await assert.rejects(() => coordinator.upload({ directory: 'cms/escape', fileName: 'x.png', contentBase64: pngBase64, actor: 'test' }), (error) => error.code === 'INVALID_MEDIA_PATH')
})
