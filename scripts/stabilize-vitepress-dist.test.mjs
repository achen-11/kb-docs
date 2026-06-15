import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'

import { stabilizeVitePressDist } from './stabilize-vitepress-dist.mjs'

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
      path.join(distDir, 'cms', 'index.html'),
      '<script src="/assets/app.C-s7rvUH.js"></script><script src="/assets/cms_index.md.CjSAPaXE.lean.js"></script>',
      'utf8'
    )

    const result = await stabilizeVitePressDist(distDir)
    assert.equal(result.renamed, 2)

    const html = await readFile(path.join(distDir, 'cms', 'index.html'), 'utf8')
    assert.match(html, /\/assets\/app\.js/)
    assert.match(html, /\/assets\/cms_index\.md\.lean\.js/)
  } finally {
    await rm(distDir, { recursive: true, force: true })
  }
})
