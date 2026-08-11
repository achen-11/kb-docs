import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createPreviewHttpServer,
  publishPreviewRelease,
  readPreviewStatus,
  resolvePreviewFile,
  shouldIgnoreWatchPath,
  writePreviewStatus
} from './local-preview-server.mjs'

async function createDist(root, marker) {
  const distDir = path.join(root, `dist-${marker}`)
  await mkdir(path.join(distDir, 'cms'), { recursive: true })
  await writeFile(path.join(distDir, 'index.html'), `<h1>${marker}</h1>`, 'utf-8')
  await writeFile(path.join(distDir, 'cms', 'index.html'), `<h1>cms-${marker}</h1>`, 'utf-8')
  await writeFile(path.join(distDir, '404.html'), '<h1>missing</h1>', 'utf-8')
  return distDir
}

async function request(server, pathname) {
  const address = server.address()
  return new Promise((resolve, reject) => {
    const clientRequest = http.get(
      {
        agent: false,
        headers: { Connection: 'close' },
        host: '127.0.0.1',
        port: address.port,
        path: pathname
      },
      (response) => {
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          resolve({
            body: Buffer.concat(chunks).toString('utf-8'),
            headers: response.headers,
            statusCode: response.statusCode
          })
        })
      }
    )
    clientRequest.on('error', reject)
  })
}

test('publishPreviewRelease switches only after a valid release is complete', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-preview-release-'))
  const previewRoot = path.join(root, 'preview')
  try {
    const firstDist = await createDist(root, 'first')
    await publishPreviewRelease({
      distDir: firstDist,
      previewRoot,
      releaseId: 'release-1',
      metadata: { releaseId: 'release-1' },
      keepReleases: 2
    })

    const firstCurrent = await realpath(path.join(previewRoot, 'current'))
    assert.match(firstCurrent, /release-1$/u)
    assert.match(await readFile(path.join(firstCurrent, 'index.html'), 'utf-8'), /first/u)

    const invalidDist = path.join(root, 'invalid-dist')
    await mkdir(invalidDist)
    await assert.rejects(
      publishPreviewRelease({
        distDir: invalidDist,
        previewRoot,
        releaseId: 'release-invalid',
        metadata: {},
        keepReleases: 2
      })
    )
    assert.equal(await realpath(path.join(previewRoot, 'current')), firstCurrent)

    const secondDist = await createDist(root, 'second')
    await publishPreviewRelease({
      distDir: secondDist,
      previewRoot,
      releaseId: 'release-2',
      metadata: { releaseId: 'release-2' },
      keepReleases: 2
    })
    const secondCurrent = await realpath(path.join(previewRoot, 'current'))
    assert.match(secondCurrent, /release-2$/u)
    assert.match(await readFile(path.join(secondCurrent, 'index.html'), 'utf-8'), /second/u)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('resolvePreviewFile supports clean routes and blocks escaped paths', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-preview-route-'))
  try {
    const distDir = await createDist(root, 'route')
    const cleanRoute = await resolvePreviewFile(distDir, '/cms/')
    assert.equal(cleanRoute.statusCode, 200)
    assert.equal(cleanRoute.filePath, path.join(distDir, 'cms', 'index.html'))

    const escapedRoute = await resolvePreviewFile(distDir, '/../outside')
    assert.equal(escapedRoute.statusCode, 403)
    assert.equal(escapedRoute.filePath, null)

    const missingRoute = await resolvePreviewFile(distDir, '/does-not-exist')
    assert.equal(missingRoute.statusCode, 404)
    assert.equal(missingRoute.filePath, path.join(distDir, '404.html'))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('watch filtering ignores VitePress build output but retains source config changes', () => {
  assert.equal(shouldIgnoreWatchPath('.vitepress/dist/assets/app.js'), true)
  assert.equal(shouldIgnoreWatchPath('.vitepress/cache/deps/app.js'), true)
  assert.equal(shouldIgnoreWatchPath('.vitepress/.temp/app.js'), true)
  assert.equal(
    shouldIgnoreWatchPath('.vitepress/config.mts.timestamp-1786358853521-a1b2c3.mjs'),
    true
  )
  assert.equal(shouldIgnoreWatchPath('.vitepress/config.mts'), false)
  assert.equal(shouldIgnoreWatchPath('cms/site/pages.md'), false)
})

test('preview status is persisted atomically and merged with the current release metadata', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-preview-status-'))
  const previewRoot = path.join(root, 'preview')
  try {
    const distDir = await createDist(root, 'status')
    await publishPreviewRelease({
      distDir,
      previewRoot,
      releaseId: 'release-status',
      metadata: {
        publishedAt: '2026-08-10T12:00:00.000Z',
        releaseId: 'release-status',
        sourceCommit: 'abc1234',
        sourceDirty: false
      }
    })
    await writePreviewStatus(previewRoot, {
      buildNumber: 3,
      error: null,
      releaseId: 'older-release',
      status: 'ready'
    })

    assert.deepEqual(await readPreviewStatus(previewRoot), {
      buildNumber: 3,
      error: null,
      lastSuccessAt: '2026-08-10T12:00:00.000Z',
      releaseId: 'release-status',
      sourceCommit: 'abc1234',
      sourceDirty: false,
      status: 'ready'
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('preview HTTP server exposes status and serves the current release', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-preview-http-'))
  const previewRoot = path.join(root, 'preview')
  const state = { status: 'ready', releaseId: 'release-http', error: null }
  const server = createPreviewHttpServer({ previewRoot, state })
  try {
    const distDir = await createDist(root, 'http')
    await publishPreviewRelease({
      distDir,
      previewRoot,
      releaseId: 'release-http',
      metadata: { releaseId: 'release-http' }
    })
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })

    const statusResponse = await request(server, '/__preview/status')
    assert.equal(statusResponse.statusCode, 200)
    assert.deepEqual(JSON.parse(statusResponse.body), state)

    const pageResponse = await request(server, '/cms/')
    assert.equal(pageResponse.statusCode, 200)
    assert.match(pageResponse.body, /cms-http/u)
    assert.equal(pageResponse.headers['x-robots-tag'], 'noindex, nofollow')

    const missingResponse = await request(server, '/missing')
    assert.equal(missingResponse.statusCode, 404)
    assert.match(missingResponse.body, /missing/u)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await rm(root, { recursive: true, force: true })
  }
})
