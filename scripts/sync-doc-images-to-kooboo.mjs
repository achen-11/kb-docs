import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

/** docs/public/{name} → kb-remote-site/images/{name} */
export const DOC_IMAGE_PUBLIC_DIRS = ['cms']

const docsPublicDir = path.join(projectRoot, 'docs', 'public')
const koobooImagesDir = path.join(projectRoot, 'kb-remote-site', 'images')

const IMAGE_EXT = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.avif'
])

export function isDocImagePath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/')
  const segment = normalized.split('/')[0]
  if (!DOC_IMAGE_PUBLIC_DIRS.includes(segment)) {
    return false
  }
  const ext = path.extname(normalized).toLowerCase()
  return IMAGE_EXT.has(ext)
}

async function walkFiles(rootDir) {
  let entries
  try {
    entries = await readdir(rootDir, { withFileTypes: true })
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return []
    }
    throw error
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(rootDir, entry.name)
      if (entry.isDirectory()) {
        return walkFiles(absolutePath)
      }
      return [absolutePath]
    })
  )

  return files.flat()
}

async function copyTree(sourceDir, targetDir) {
  const files = await walkFiles(sourceDir)
  for (const filePath of files) {
    const relative = path.relative(sourceDir, filePath).replace(/\\/g, '/')
    if (!isDocImagePath(`${path.basename(sourceDir)}/${relative}`)) {
      continue
    }
    const targetPath = path.join(targetDir, relative)
    await mkdir(path.dirname(targetPath), { recursive: true })
    await cp(filePath, targetPath, { force: true })
  }
}

/**
 * Copy docs/public/{cms,...} → kb-remote-site/images/{cms,...}
 * Replaces each target subtree so removals in public are reflected.
 */
export async function syncPublicImagesToKooboo() {
  const copied = []

  for (const name of DOC_IMAGE_PUBLIC_DIRS) {
    const source = path.join(docsPublicDir, name)
    const target = path.join(koobooImagesDir, name)

    try {
      await stat(source)
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        continue
      }
      throw error
    }

    await rm(target, { recursive: true, force: true })
    await mkdir(path.join(koobooImagesDir), { recursive: true })
    await copyTree(source, target)
    copied.push(name)
  }

  return copied
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  const dirs = await syncPublicImagesToKooboo()
  if (dirs.length === 0) {
    console.log('No doc image folders copied (missing docs/public/{cms,...}).')
  } else {
    console.log(`Copied docs/public → kb-remote-site/images: ${dirs.join(', ')}`)
  }
}
