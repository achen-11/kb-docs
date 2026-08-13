import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isDocImagePath,
  syncPublicImagesToKooboo
} from './sync-doc-images-to-kooboo.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

export const distDir = path.join(projectRoot, 'docs', '.vitepress', 'dist')
export const koobooSiteDir = path.join(projectRoot, 'kb-remote-site')
export const koobooSrcDir = path.join(koobooSiteDir, 'src')

const generatedPaths = {
  pageDir: path.join(koobooSrcDir, 'page'),
  jsAssetsDir: path.join(koobooSrcDir, 'js', 'assets'),
  cssAssetsDir: path.join(koobooSrcDir, 'css', 'assets'),
  contentFileDir: path.join(koobooSiteDir, 'content-file'),
  legacyContentFileDir: path.join(koobooSrcDir, 'content-file'),
  vpIconsCssFile: path.join(koobooSrcDir, 'css', 'vp-icons.css'),
  hashMapFile: path.join(koobooSiteDir, 'content-file', 'hashmap.json')
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

/**
 * Kooboo 页面路由：保留 dist 相对路径（含 index.html）。
 * 勿将 cms/index.html 映射为 /cms/ —— 否则 Page/post 易 400（Object reference not set）。
 */
export function toKoobooPageRoute(distRelativePath) {
  const normalized = normalizeRelativePath(distRelativePath)
  return `/${normalized}`
}

export function toKoobooAssetRoute(distRelativePath) {
  const normalized = normalizeRelativePath(distRelativePath)

  if (normalized.startsWith('assets/')) {
    return `/${normalized}`
  }

  return `/${normalized}`
}

export function absolutizeDocumentRelativeUrls(html, distRelativePath, pageRelativePaths = new Set()) {
  const normalized = normalizeRelativePath(distRelativePath).replace(/^\/+/, '')
  const baseUrl = new URL(normalized, 'https://kooboo-export.local/')

  return html.replace(
    /(\b(?:href|src)=)(["'])([^"']*)\2/giu,
    (_match, attribute, quote, value) => {
      const isDocumentRelative = /^\.\.?\//u.test(value)
      const isSiteRootHref = attribute.toLowerCase().startsWith('href') &&
        value.startsWith('/') &&
        !value.startsWith('//')

      if (!isDocumentRelative && !isSiteRootHref) {
        return `${attribute}${quote}${value}${quote}`
      }

      const resolved = new URL(value, baseUrl)
      let pathname =
        resolved.pathname !== '/' && resolved.pathname.endsWith('/')
          ? `${resolved.pathname}index.html`
          : resolved.pathname

      if (
        pathname !== '/' &&
        !path.posix.extname(pathname) &&
        pageRelativePaths.has(`${pathname.replace(/^\//, '')}.html`)
      ) {
        pathname = `${pathname}.html`
      }

      return `${attribute}${quote}${pathname}${resolved.search}${resolved.hash}${quote}`
    }
  )
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
    rm(generatedPaths.contentFileDir, { recursive: true, force: true }),
    rm(generatedPaths.legacyContentFileDir, { recursive: true, force: true }),
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
    targetPath: path.join(koobooSiteDir, 'content-file', distRelativePath)
  }
}

function getDistFileTarget(distRelativePath) {
  const normalized = normalizeRelativePath(distRelativePath)

  if (normalized.startsWith('.')) {
    return null
  }

  // 文档配图走 kb-remote-site/images（由 docs/public 同步），不写入 content-file
  if (isDocImagePath(normalized)) {
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
      targetPath: path.join(koobooSiteDir, 'content-file', normalized)
    }
  }

  return getRootStaticTarget(normalized)
}

async function exportFile(sourcePath, pageRelativePaths) {
  const relativePath = normalizeRelativePath(path.relative(distDir, sourcePath))
  const target = getDistFileTarget(relativePath)

  if (!target) {
    return
  }

  if (target.type === 'page') {
    const html = await readFile(sourcePath, 'utf8')
    const normalizedHtml = absolutizeDocumentRelativeUrls(html, relativePath, pageRelativePaths)
    await writeTextFile(target.targetPath, injectPageRouteComment(normalizedHtml, target.route))
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
  const pageRelativePaths = new Set(
    files
      .map((filePath) => normalizeRelativePath(path.relative(distDir, filePath)))
      .filter((relativePath) => relativePath.endsWith('.html'))
  )
  for (const filePath of files) {
    await exportFile(filePath, pageRelativePaths)
  }

  await syncPublicImagesToKooboo()
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  await exportVitePressToKooboo()
}
