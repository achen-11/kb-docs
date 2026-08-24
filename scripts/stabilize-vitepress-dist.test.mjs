import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'

import {
  stabilizeVitePressDist,
  stabilizeVitePressHashMap
} from './stabilize-vitepress-dist.mjs'

test('stabilizeVitePressDist renames hashed assets and updates html references', async () => {
  const distDir = await mkdtemp(path.join(tmpdir(), 'vp-dist-'))

  try {
    await mkdir(path.join(distDir, 'assets'), { recursive: true })
    await mkdir(path.join(distDir, 'cms'), { recursive: true })
    await writeFile(
      path.join(distDir, 'assets', 'app.C-s7rvUH.js'),
      'export const app = 1\nimport "./cms_index.md.CjSAPaXE.lean.js"\n',
      'utf8'
    )
    await writeFile(
      path.join(distDir, 'assets', 'cms_index.md.CjSAPaXE.lean.js'),
      'export default {}\n',
      'utf8'
    )
    await writeFile(
      path.join(distDir, 'assets', 'style.css'),
      'body { color: black; }\n',
      'utf8'
    )
    await writeFile(
      path.join(distDir, 'assets', 'VPLocalSearchBox.js'),
      'export const localSearch = true\n',
      'utf8'
    )
    await writeFile(
      path.join(distDir, 'assets', 'theme.js'),
      'export const loadSearch = () => import("./VPLocalSearchBox.js")\n',
      'utf8'
    )
    await writeFile(
      path.join(distDir, 'hashmap.json'),
      JSON.stringify({ 'cms_index.md': 'CjSAPaXE' }),
      'utf8'
    )
    await writeFile(
      path.join(distDir, 'cms', 'index.html'),
      '<link rel="stylesheet" href="/assets/style.css"><script src="/assets/app.C-s7rvUH.js"></script><script src="/assets/cms_index.md.CjSAPaXE.lean.js"></script><script>window.__VP_HASH_MAP__=JSON.parse("{\\"cms_index.md\\":\\"CjSAPaXE\\"}");</script>',
      'utf8'
    )

    const result = await stabilizeVitePressDist(distDir)
    assert.equal(result.renamed, 4)

    const html = await readFile(path.join(distDir, 'cms', 'index.html'), 'utf8')
    assert.match(html, /\/assets\/vitepress-app\.js/)
    assert.match(html, /\/assets\/vitepress-style\.css/)
    assert.match(html, /\/assets\/cms_index\.md\.stable\.lean\.js/)
    assert.match(html, /window\.__VP_HASH_MAP__=JSON\.parse\("\{\\"cms_index\.md\\":\\"stable\\"\}"\)/)
    assert.equal(
      await readFile(path.join(distDir, 'assets', 'vitepress-local-search.js'), 'utf8'),
      'export const localSearch = true\n'
    )
    assert.match(
      await readFile(path.join(distDir, 'assets', 'theme.js'), 'utf8'),
      /import\("\.\/vitepress-local-search\.js"\)/
    )
    assert.equal(
      await readFile(path.join(distDir, 'hashmap.json'), 'utf8'),
      JSON.stringify({ 'cms_index.md': 'stable' })
    )
  } finally {
    await rm(distDir, { recursive: true, force: true })
  }
})

test('stabilizeVitePressHashMap uses the runtime-compatible stable token', () => {
  assert.deepEqual(stabilizeVitePressHashMap({ 'a.md': 'hash-a', 'b.md': 'hash-b' }), {
    'a.md': 'stable',
    'b.md': 'stable'
  })
})
