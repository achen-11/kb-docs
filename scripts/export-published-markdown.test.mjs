import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { exportPublishedMarkdown } from './export-published-markdown.mjs'

test('publishes original bytes at rewritten routes and excludes internal/unpublished sources', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'published-markdown-'))
  try {
    const srcDir = path.join(root, 'docs')
    const outDir = path.join(root, 'dist')
    for (const dir of ['en/cms', 'public/cms', 'guide']) {
      await mkdir(path.join(srcDir, dir), { recursive: true })
    }
    await mkdir(path.join(outDir, 'cms'), { recursive: true })
    const original = '---\r\ntitle: Login\r\n---\r\n# Login\r\n<DocImage src="/cms/login.png" />\r\n'
    await writeFile(path.join(srcDir, 'en/cms/login.md'), original)
    await writeFile(path.join(srcDir, 'guide/private.md'), '# Unpublished')
    await writeFile(path.join(srcDir, 'public/cms/README.md'), '# Internal')
    await writeFile(path.join(outDir, 'cms/README.md'), '# Internal')
    await exportPublishedMarkdown({
      srcDir, outDir,
      pages: ['en/cms/login.md'],
      rewrites: { map: { 'en/cms/login.md': 'cms/login.md' } },
    })
    assert.equal(await readFile(path.join(outDir, 'cms/login.md'), 'utf8'), original)
    for (const file of ['en/cms/login.md', 'cms/README.md', 'guide/private.md']) {
      await assert.rejects(access(path.join(outDir, file)), { code: 'ENOENT' })
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
