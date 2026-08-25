import { readdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const distDir = path.join(path.resolve(__dirname, '..'), 'docs', '.vitepress', 'dist')
export const stablePageChunkHash = 'stable'
export const runtimeDataRelativePath = 'assets/vitepress-runtime-data.js'

const renameRules = [
  {
    pattern: /^VPLocalSearchBox(?:\.[A-Za-z0-9_-]+)?\.js$/,
    stable: 'vitepress-local-search.js'
  },
  { pattern: /^(.+\.md)\.[A-Za-z0-9_-]+\.lean\.js$/, stable: '$1.stable.lean.js' },
  { pattern: /^(.+\.md)\.[A-Za-z0-9_-]+\.js$/, stable: '$1.stable.js' },
  { pattern: /^app\.[A-Za-z0-9_-]+\.js$/, stable: 'vitepress-app.js' },
  { pattern: /^(.+?)\.[A-Za-z0-9_-]+\.(woff2?|ttf|eot)$/i, stable: '$1.$2' },
  { pattern: /^style\.css$/, stable: 'vitepress-style.css' },
  { pattern: /^style\.[A-Za-z0-9_-]+\.css$/, stable: 'vitepress-style.css' },
  { pattern: /^chunks\/(.+?)\.[A-Za-z0-9_-]+\.js$/, stable: 'chunks/$1.js' },
  { pattern: /^(.+?)\.[A-Za-z0-9_-]+\.js$/, stable: '$1.js' },
]

function toStableRelativePath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/')
  const basename = normalized.startsWith('assets/')
    ? normalized.slice('assets/'.length)
    : normalized

  for (const rule of renameRules) {
    const match = basename.match(rule.pattern)
    if (!match) {
      continue
    }

    let stable = rule.stable
    for (let index = 1; index < match.length; index += 1) {
      stable = stable.replace(`$${index}`, match[index])
    }

    return path.posix.join('assets', stable)
  }

  return normalized
}

async function walkFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true })
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

function buildReplacementMap(renameMap) {
  /** @type {Array<[string, string]>} */
  const replacements = []

  for (const [from, to] of renameMap.entries()) {
    const fromUrl = `/${from}`
    const toUrl = `/${to}`
    replacements.push([from, to])
    replacements.push([fromUrl, toUrl])

    const fromAssetPath = from.replace(/^assets\//, '')
    const toAssetPath = to.replace(/^assets\//, '')
    if (!fromAssetPath.includes('/') && !toAssetPath.includes('/')) {
      replacements.push([`./${fromAssetPath}`, `./${toAssetPath}`])
    }
  }

  return replacements.sort((a, b) => b[0].length - a[0].length)
}

function applyReplacements(content, replacements) {
  let next = content
  for (const [from, to] of replacements) {
    next = next.split(from).join(to)
  }
  return next
}

export function stabilizeVitePressHashMap(hashMap) {
  return Object.fromEntries(Object.keys(hashMap).map((key) => [key, stablePageChunkHash]))
}

function replaceInlineHashMap(content, stableHashMap) {
  const serialized = JSON.stringify(JSON.stringify(stableHashMap))
  return content.replace(
    /window\.__VP_HASH_MAP__=JSON\.parse\("(?:\\.|[^"\\])*"\);/g,
    `window.__VP_HASH_MAP__=JSON.parse(${serialized});`
  )
}

const inlineRuntimeDataPattern =
  /<script>(window\.__VP_HASH_MAP__=JSON\.parse\("(?:\\.|[^"\\])*"\);\s*window\.__VP_SITE_DATA__=JSON\.parse\("(?:\\.|[^"\\])*"\);)<\/script>/g

export function extractInlineRuntimeData(content) {
  const matches = [...content.matchAll(inlineRuntimeDataPattern)]
  if (matches.length !== 1 || !matches[0]?.[1]) {
    throw new Error('Expected exactly one inline VitePress runtime data block')
  }
  return `${matches[0][1]}\n`
}

export function replaceInlineRuntimeData(content, runtimeUrl = `/${runtimeDataRelativePath}`) {
  let count = 0
  const next = content.replace(inlineRuntimeDataPattern, () => {
    count += 1
    return `<script src="${runtimeUrl}"></script>`
  })
  if (count !== 1) {
    throw new Error('Expected exactly one inline VitePress runtime data block')
  }
  return next
}

/**
 * 将 VitePress dist 中带 hash 的资源文件名稳定化，并回写 HTML/JS/CSS 引用。
 */
export async function stabilizeVitePressDist(rootDir = distDir) {
  const assetsDir = path.join(rootDir, 'assets')
  const hashMapPath = path.join(rootDir, 'hashmap.json')
  const stableHashMap = stabilizeVitePressHashMap(
    JSON.parse(await readFile(hashMapPath, 'utf8'))
  )
  const assetFiles = await walkFiles(assetsDir)

  /** @type {Map<string, string>} */
  const renameMap = new Map()

  for (const absolutePath of assetFiles) {
    const relative = path.relative(rootDir, absolutePath).replace(/\\/g, '/')
    const stable = toStableRelativePath(relative)
    if (stable !== relative) {
      renameMap.set(relative, stable)
    }
  }

  if (renameMap.size === 0) {
    return { renamed: 0, updatedFiles: 0 }
  }

  for (const [from, to] of [...renameMap.entries()].sort((a, b) => b[0].length - a[0].length)) {
    const fromPath = path.join(rootDir, from)
    const toPath = path.join(rootDir, to)
    await rename(fromPath, toPath)
  }

  const replacements = buildReplacementMap(renameMap)
  const textFiles = (await walkFiles(rootDir)).filter((filePath) =>
    /\.(?:html|js|css)$/i.test(filePath)
  )

  let updatedFiles = 0
  let runtimeData
  for (const filePath of textFiles) {
    const original = await readFile(filePath, 'utf8')
    const replaced = applyReplacements(original, replacements)
    let next = replaced
    if (filePath.endsWith('.html')) {
      next = replaceInlineHashMap(next, stableHashMap)
      if (next.includes('window.__VP_HASH_MAP__') || next.includes('window.__VP_SITE_DATA__')) {
        const currentRuntimeData = extractInlineRuntimeData(next)
        if (runtimeData !== undefined && runtimeData !== currentRuntimeData) {
          throw new Error('VitePress HTML files contain different runtime data blocks')
        }
        runtimeData = currentRuntimeData
        next = replaceInlineRuntimeData(next)
      }
    }
    if (next !== original) {
      await writeFile(filePath, next, 'utf8')
      updatedFiles += 1
    }
  }

  if (runtimeData === undefined) {
    throw new Error('No VitePress HTML runtime data block was found')
  }
  await writeFile(path.join(rootDir, runtimeDataRelativePath), runtimeData, 'utf8')

  await writeFile(hashMapPath, JSON.stringify(stableHashMap), 'utf8')

  return { renamed: renameMap.size, updatedFiles }
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  const result = await stabilizeVitePressDist()
  console.log(`Stabilized ${result.renamed} assets, updated ${result.updatedFiles} references.`)
}
