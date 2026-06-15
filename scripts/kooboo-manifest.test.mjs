import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'

import {
  buildManifest,
  diffManifestFiles,
  normalizePageHtmlForManifest,
  planPushTargets,
  sortManifestFiles
} from './kooboo-manifest.mjs'

test('diffManifestFiles detects added, modified, and removed', () => {
  const diff = diffManifestFiles(
    {
      'src/page/a.html': 'hash-a-old',
      'src/js/old.js': 'hash-js'
    },
    {
      'src/page/a.html': 'hash-a-new',
      'src/page/b.html': 'hash-b'
    }
  )

  assert.deepEqual(diff.added, ['src/page/b.html'])
  assert.deepEqual(diff.modified, ['src/page/a.html'])
  assert.deepEqual(diff.removed, ['src/js/old.js'])
  assert.deepEqual(diff.changed, ['src/page/b.html', 'src/page/a.html'])
})

test('planPushTargets keeps per-file push for small diffs', () => {
  const plan = planPushTargets(['src/page/a.html', 'src/js/app.js'])
  assert.deepEqual(plan, [
    { target: 'src/page/a.html', count: 1 },
    { target: 'src/js/app.js', count: 1 }
  ])
})

test('planPushTargets groups large diffs by top-level directory', () => {
  const changed = [
    'src/page/a.html',
    'src/page/b.html',
    'src/js/app.js',
    'images/cms/a.png'
  ]

  const plan = planPushTargets(changed, { groupThreshold: 2 })
  assert.deepEqual(plan, [
    { target: 'images', count: 1 },
    { target: 'src/js', count: 1 },
    { target: 'src/page', count: 2 }
  ])
})

test('sortManifestFiles sorts file keys for stable git diffs', () => {
  const sorted = sortManifestFiles({
    version: 1,
    files: {
      'src/page/b.html': '2',
      'src/page/a.html': '1'
    }
  })

  assert.deepEqual(Object.keys(sorted.files), ['src/page/a.html', 'src/page/b.html'])
})

test('normalizePageHtmlForManifest ignores global VP hash map changes', () => {
  const base =
    '<html><script>window.__VP_HASH_MAP__=JSON.parse("{\\"cms_index.md\\":\\"OLD\\"}");</script><body>same</body></html>'
  const next =
    '<html><script>window.__VP_HASH_MAP__=JSON.parse("{\\"cms_index.md\\":\\"NEW\\"}");</script><body>same</body></html>'

  assert.equal(normalizePageHtmlForManifest(base), normalizePageHtmlForManifest(next))
})

test('buildManifest hashes files under manifest roots', async () => {
  const siteDir = await mkdtemp(path.join(tmpdir(), 'kb-manifest-'))

  try {
    await mkdir(path.join(siteDir, 'src/page'), { recursive: true })
    await writeFile(path.join(siteDir, 'src/page/index.html'), '<!-- page -->', 'utf8')

    const manifest = await buildManifest(siteDir)
    assert.equal(Object.keys(manifest.files).length, 1)
    assert.ok(manifest.files['src/page/index.html'])
  } finally {
    await rm(siteDir, { recursive: true, force: true })
  }
})
