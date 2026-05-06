import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

export const distDir = path.join(projectRoot, 'docs', '.vitepress', 'dist')
export const koobooSrcDir = path.join(projectRoot, 'kb-remote-site', 'src')

const generatedPaths = {
  pageDir: path.join(koobooSrcDir, 'page'),
  jsAssetsDir: path.join(koobooSrcDir, 'js', 'assets'),
  cssAssetsDir: path.join(koobooSrcDir, 'css', 'assets'),
  contentFileAssetsDir: path.join(koobooSrcDir, 'content-file', 'assets'),
  vpIconsCssFile: path.join(koobooSrcDir, 'css', 'vp-icons.css'),
  hashMapFile: path.join(koobooSrcDir, 'content-file', 'hashmap.json')
}

function normalizeRelativePath(relativePath) {
  return relativePath.replace(/\\/g, '/')
}

function removeLeadingRouteComment(content, type) {
  if (type === 'html') {
    return content.replace(/^<!--\s*@k-url\s+.+?-->\s*/u, '')
  }

  if (type === 'js') {
    return content.replace(/^\/\/\s*@k-url\s+.+\n?/u, '')
  }

  if (type === 'css') {
    return content.replace(/^\/\*\s*@k-url\s+[\s\S]*?\*\/\s*/u, '')
  }

  return content
}

export function toKoobooPageRoute(distRelativePath) {
  const normalized = normalizeRelativePath(distRelativePath)

  if (normalized === 'index.html') {
    return '/'
  }

  if (normalized.endsWith('/index.html')) {
    return `/${normalized.slice(0, -'index.html'.length)}`
  }

  return `/${normalized}`
}

export function toKoobooAssetRoute(distRelativePath) {
  const normalized = normalizeRelativePath(distRelativePath)

  if (normalized.startsWith('assets/')) {
    return `/${normalized}`
  }

  return `/${normalized}`
}

export function injectPageRouteComment(html, route) {
  const body = removeLeadingRouteComment(html, 'html')
  return `<!-- @k-url ${route} -->\n${body}`
}

export function injectJsRouteComment(code, route) {
  const body = removeLeadingRouteComment(code, 'js')
  return `// @k-url ${route}\n${body}`
}

export function injectCssRouteComment(css, route) {
  const body = removeLeadingRouteComment(css, 'css')
  return `/* @k-url ${route} */\n${body}`
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

async function ensureParentDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true })
}

async function writeTextFile(targetPath, content) {
  await ensureParentDir(targetPath)
  await writeFile(targetPath, content, 'utf8')
}

async function copyBinaryFile(sourcePath, targetPath) {
  await ensureParentDir(targetPath)
  await cp(sourcePath, targetPath, { force: true })
}

async function resetGeneratedOutput() {
  await Promise.all([
    rm(generatedPaths.pageDir, { recursive: true, force: true }),
    rm(generatedPaths.jsAssetsDir, { recursive: true, force: true }),
    rm(generatedPaths.cssAssetsDir, { recursive: true, force: true }),
    rm(generatedPaths.contentFileAssetsDir, { recursive: true, force: true }),
    rm(generatedPaths.vpIconsCssFile, { force: true }),
    rm(generatedPaths.hashMapFile, { force: true })
  ])
}

function getRootStaticTarget(distRelativePath) {
  if (distRelativePath === 'vp-icons.css') {
    return {
      type: 'css',
      targetPath: generatedPaths.vpIconsCssFile,
      route: '/vp-icons.css'
    }
  }

  return {
    type: 'content-file',
    targetPath: path.join(koobooSrcDir, 'content-file', distRelativePath)
  }
}

function getDistFileTarget(distRelativePath) {
  const normalized = normalizeRelativePath(distRelativePath)

  if (normalized.startsWith('.')) {
    return null
  }

  if (normalized.endsWith('.html')) {
    return {
      type: 'page',
      targetPath: path.join(koobooSrcDir, 'page', normalized),
      route: toKoobooPageRoute(normalized)
    }
  }

  if (normalized.startsWith('assets/')) {
    if (normalized.endsWith('.js')) {
      return {
        type: 'js',
        targetPath: path.join(koobooSrcDir, 'js', normalized),
        route: toKoobooAssetRoute(normalized)
      }
    }

    if (normalized.endsWith('.css')) {
      return {
        type: 'css',
        targetPath: path.join(koobooSrcDir, 'css', normalized),
        route: toKoobooAssetRoute(normalized)
      }
    }

    return {
      type: 'content-file',
      targetPath: path.join(koobooSrcDir, 'content-file', normalized)
    }
  }

  return getRootStaticTarget(normalized)
}

async function exportFile(sourcePath) {
  const relativePath = normalizeRelativePath(path.relative(distDir, sourcePath))
  const target = getDistFileTarget(relativePath)

  if (!target) {
    return
  }

  if (target.type === 'page') {
    const html = await readFile(sourcePath, 'utf8')
    await writeTextFile(target.targetPath, injectPageRouteComment(html, target.route))
    return
  }

  if (target.type === 'js') {
    const code = await readFile(sourcePath, 'utf8')
    await writeTextFile(target.targetPath, injectJsRouteComment(code, target.route))
    return
  }

  if (target.type === 'css') {
    const css = await readFile(sourcePath, 'utf8')
    await writeTextFile(target.targetPath, injectCssRouteComment(css, target.route))
    return
  }

  await copyBinaryFile(sourcePath, target.targetPath)
}

export async function exportVitePressToKooboo() {
  await resetGeneratedOutput()

  const files = await walkFiles(distDir)
  for (const filePath of files) {
    await exportFile(filePath)
  }
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  await exportVitePressToKooboo()
}
