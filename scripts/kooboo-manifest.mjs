import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdir, readFile, stat, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const projectRoot = path.resolve(__dirname, '..')
export const koobooSiteDir = path.join(projectRoot, 'kb-remote-site')
/** 团队共享：记录上次成功部署到 Kooboo 远端的资源指纹，纳入 Git 同步 */
export const baselineManifestPath = path.join(projectRoot, '.kooboo-deploy', 'last-manifest.json')

/** kb push 路径前缀（相对 kb-remote-site 根目录） */
export const manifestRoots = ['src/page', 'src/js', 'src/css', 'src/content-file', 'images']

function normalizeKey(relativePath) {
  return relativePath.replace(/\\/g, '/')
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

const pageHashMapScriptPattern =
  /<script>window\.__VP_HASH_MAP__=JSON\.parse\("[\s\S]*?"\);<\/script>\n?/g

export function normalizePageHtmlForManifest(html) {
  return html.replace(pageHashMapScriptPattern, '')
}

export function normalizeHashmapJsonForManifest(raw) {
  const parsed = JSON.parse(raw)
  const keys = Object.keys(parsed).sort()
  return JSON.stringify(keys)
}

export function hashManifestContent(relativePath, content) {
  let normalized = content

  if (relativePath.startsWith('src/page/') && relativePath.endsWith('.html')) {
    normalized = normalizePageHtmlForManifest(content)
  } else if (relativePath === 'src/content-file/hashmap.json') {
    normalized = normalizeHashmapJsonForManifest(content)
  }

  return createHash('sha256').update(normalized).digest('hex')
}

async function hashFile(filePath, relativePath) {
  const useNormalizedTextHash =
    !relativePath.startsWith('images/') &&
    (relativePath.startsWith('src/page/') ||
      relativePath === 'src/content-file/hashmap.json' ||
      relativePath.endsWith('.js') ||
      relativePath.endsWith('.css'))

  if (useNormalizedTextHash) {
    const content = await readFile(filePath, 'utf8')
    return hashManifestContent(relativePath, content)
  }

  const buffer = await readFile(filePath)
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * 扫描 kb-remote-site 下可推送资源，生成 path → sha256 清单。
 * @param {string} [siteDir]
 */
export async function buildManifest(siteDir = koobooSiteDir) {
  /** @type {Record<string, string>} */
  const files = {}

  for (const root of manifestRoots) {
    const absoluteRoot = path.join(siteDir, root)
    let rootStat
    try {
      rootStat = await stat(absoluteRoot)
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        continue
      }
      throw error
    }

    if (!rootStat.isDirectory()) {
      const key = normalizeKey(root)
      files[key] = await hashFile(absoluteRoot, key)
      continue
    }

    const allFiles = await walkFiles(absoluteRoot)
    for (const filePath of allFiles) {
      if (path.basename(filePath) === '.DS_Store') {
        continue
      }

      const key = normalizeKey(path.relative(siteDir, filePath))
      files[key] = await hashFile(filePath, key)
    }
  }

  return sortManifestFiles({
    version: 1,
    generatedAt: new Date().toISOString(),
    files
  })
}

export function sortManifestFiles(manifest) {
  return {
    ...manifest,
    files: Object.fromEntries(Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b)))
  }
}

export function getGitDeployMeta() {
  try {
    const gitCommit = execSync('git rev-parse HEAD', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()

    return { gitCommit, gitBranch }
  } catch {
    return {}
  }
}

/**
 * @param {Record<string, string> | null | undefined} baselineFiles
 * @param {Record<string, string>} currentFiles
 */
export function diffManifestFiles(baselineFiles, currentFiles) {
  const baseline = baselineFiles ?? {}
  const added = []
  const modified = []
  const removed = []

  for (const [key, hash] of Object.entries(currentFiles)) {
    if (!(key in baseline)) {
      added.push(key)
    } else if (baseline[key] !== hash) {
      modified.push(key)
    }
  }

  for (const key of Object.keys(baseline)) {
    if (!(key in currentFiles)) {
      removed.push(key)
    }
  }

  added.sort()
  modified.sort()
  removed.sort()

  return {
    added,
    modified,
    removed,
    changed: [...added, ...modified]
  }
}

export async function loadBaselineManifest(manifestPath = baselineManifestPath) {
  try {
    const raw = await readFile(manifestPath, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.files !== 'object') {
      throw new Error(`Invalid manifest: ${manifestPath}`)
    }
    return parsed
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

export async function saveBaselineManifest(manifest, manifestPath = baselineManifestPath) {
  const payload = sortManifestFiles({
    ...manifest,
    ...getGitDeployMeta(),
    fileCount: Object.keys(manifest.files).length
  })

  await mkdir(path.dirname(manifestPath), { recursive: true })
  await writeFile(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return payload
}

const pushGroupPrefixes = manifestRoots

/**
 * 变更较少时逐文件 push；首次全量或变更过多时按顶层目录合并。
 * @param {string[]} changedPaths
 * @param {{ groupThreshold?: number }} [options]
 */
export function planPushTargets(changedPaths, options = {}) {
  const groupThreshold = options.groupThreshold ?? 40
  if (changedPaths.length === 0) {
    return []
  }

  if (changedPaths.length <= groupThreshold) {
    return changedPaths.map((target) => ({ target, count: 1 }))
  }

  /** @type {Map<string, number>} */
  const groups = new Map()

  for (const filePath of changedPaths) {
    const group =
      pushGroupPrefixes.find((prefix) => filePath === prefix || filePath.startsWith(`${prefix}/`)) ??
      filePath.split('/').slice(0, 2).join('/')

    groups.set(group, (groups.get(group) ?? 0) + 1)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([target, count]) => ({ target, count }))
}
