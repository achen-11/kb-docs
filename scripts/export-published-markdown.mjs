import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import path from 'node:path'

// Public assets may contain internal Markdown notes. Do not publish those notes.
async function removePublicMarkdown(srcDir, outDir, relativeDir = 'public') {
  const entries = await readdir(path.join(srcDir, relativeDir), { withFileTypes: true })
    .catch((error) => {
      if (error.code === 'ENOENT') return []
      throw error
    })
  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name)
    if (entry.isDirectory()) {
      await removePublicMarkdown(srcDir, outDir, relativePath)
    } else if (entry.name.endsWith('.md')) {
      await rm(path.join(outDir, path.relative('public', relativePath)), { force: true })
    }
  }
}

/** Copy only published sources, using the same route rewrites as their HTML pages. */
export async function exportPublishedMarkdown({ srcDir, outDir, pages, rewrites }) {
  await removePublicMarkdown(srcDir, outDir)
  for (const source of pages) {
    if (!source.endsWith('.md') || source.startsWith('public/')) continue
    const route = rewrites.map[source] || source
    const target = path.join(outDir, route)
    await mkdir(path.dirname(target), { recursive: true })
    await cp(path.join(srcDir, source), target)
  }
}
