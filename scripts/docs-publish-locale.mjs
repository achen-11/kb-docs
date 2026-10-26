/**
 * Public documentation locale.
 *
 * English is the default locale at `/`. Source files stay in `docs/en/**` and
 * are rewritten to the site root. Future Chinese pages will live at `/zh/`;
 * Chinese sources are kept in git but are not published yet.
 */
export const PUBLISH_ZH = false
export const PUBLISH_CLI = false
export const PUBLISH_PRODUCT_FEATURES = false

export const PUBLISHED_VERIFY_PATHS = '/,/cms/index.html,/api/net/ip.html'

export const UNPUBLISHED_ZH_SRC_GLOBS = [
  'index.md',
  'cms/**',
  'api/**',
  'cli/**',
  'product/**',
  'quick-start/**',
  'templateEngine/**',
]

export const UNPUBLISHED_EN_SRC_GLOBS = [
  ...(PUBLISH_CLI ? [] : ['en/cli/**']),
  ...(PUBLISH_PRODUCT_FEATURES ? [] : ['en/product/**']),
]

export const UNPUBLISHED_INTERNAL_SRC_GLOBS = ['superpowers/**']

export const UNPUBLISHED_PUBLIC_ROUTE_PREFIXES = ['/cli', '/product', '/superpowers']

const ENGLISH_ASSET_PREFIXES = ['/en/cms/', '/en/product/']
const ENGLISH_ASSET_EXTENSION = /\.(?:png|jpe?g|gif|webp|svg|avif|ico)$/iu

export function stripEnglishUrlPrefix(pathname = '') {
  const value = String(pathname || '')
  if (value === '/en' || value === '/en/') return '/'
  if (value.startsWith('/en/')) return value.slice(3)
  return value
}

export function toEnglishSourcePath(relativePath = '') {
  const normalized = String(relativePath || '').replace(/\\/gu, '/').replace(/^\/+/u, '')
  if (!normalized) return normalized
  if (normalized.startsWith('en/')) return normalized
  return `en/${normalized}`
}

export function isEnglishStaticAsset(pathname = '') {
  const pathOnly = String(pathname || '').split('?')[0]
  if (!ENGLISH_ASSET_PREFIXES.some((prefix) => pathOnly.startsWith(prefix))) return false
  return ENGLISH_ASSET_EXTENSION.test(pathOnly)
}

export function canonicalPathFromLegacyEnglish(pathname = '') {
  const raw = String(pathname || '')
  if (raw.includes('/@') || raw.includes('.md')) return null
  const [pathOnly, query] = raw.split('?')
  if (isEnglishStaticAsset(pathOnly)) return null
  const next = stripEnglishUrlPrefix(pathOnly)
  if (next === pathOnly) return null
  return query ? `${next}?${query}` : next
}

export function isUnpublishedPublicRoute(pathname = '') {
  const pathOnly = String(pathname || '').split(/[?#]/u)[0]
  return UNPUBLISHED_PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)
  )
}

export function rewriteLegacyEnglishHrefs(html = '') {
  return String(html || '')
    .replace(/(href=")\/en\//gu, '$1/')
    .replace(/(href=')\/en\//gu, '$1/')
    .replace(/(href=")\/en"/gu, '$1/"')
    .replace(/(href=')\/en'/gu, "$1/'")
}

export function isEnglishDocRoute(pathname = '/') {
  const pathOnly = String(pathname || '/').split('?')[0]
  if (pathOnly === '/zh' || pathOnly.startsWith('/zh/')) return false
  return true
}

const LOCAL_CHINESE_PREVIEW_VALUES = new Set(['1', 'true', 'yes', 'on'])
const VITEPRESS_COMMANDS = new Set(['dev', 'build', 'serve', 'preview', 'init'])
const LOCAL_CHINESE_PREVIEW_TREES = [
  'cms',
  'api',
  'cli',
  'product',
  'quick-start',
  'templateEngine',
]
const LOCAL_CHINESE_DOC_ROOTS = new Set([...LOCAL_CHINESE_PREVIEW_TREES, 'guide'])

export function isVitePressDevCommand(argv = process.argv) {
  const commands = argv.map(String).filter((arg) => VITEPRESS_COMMANDS.has(arg))
  return commands.length > 0 && commands.every((command) => command === 'dev')
}

/** Local `vitepress dev` only. Production builds ignore DOCS_PREVIEW_ZH. */
export function isLocalChinesePreview(env = process.env, argv = process.argv) {
  const value = String(env.DOCS_PREVIEW_ZH ?? '').trim().toLowerCase()
  if (!LOCAL_CHINESE_PREVIEW_VALUES.has(value)) return false
  return isVitePressDevCommand(argv)
}

export function withLocalChinesePreviewRewrites(rewrites = {}) {
  const next = {}
  for (const [from, to] of Object.entries(rewrites)) {
    if (from === 'en/:rest*' || from.startsWith('en/')) {
      next[from] = to
      continue
    }
    next[from] = String(to).startsWith('zh/') ? to : `zh/${to}`
  }
  for (const tree of LOCAL_CHINESE_PREVIEW_TREES) {
    const key = `${tree}/:rest*`
    if (!Object.prototype.hasOwnProperty.call(next, key)) {
      next[key] = `zh/${tree}/:rest*`
    }
  }
  if (!Object.prototype.hasOwnProperty.call(next, 'index.md')) {
    next['index.md'] = 'zh/index.md'
  }
  return next
}

export function prefixLocalChineseDocHref(href = '') {
  const raw = String(href || '')
  if (!raw.startsWith('/') || raw.startsWith('//')) return raw
  if (raw === '/zh' || raw.startsWith('/zh/')) return raw
  const splitAt = raw.search(/[?#]/)
  const pathOnly = splitAt === -1 ? raw : raw.slice(0, splitAt)
  const suffix = splitAt === -1 ? '' : raw.slice(splitAt)
  if (pathOnly === '/') return `/zh/${suffix}`
  const extension = pathOnly.match(/\.([^./]+)$/u)?.[1]?.toLowerCase()
  if (extension && extension !== 'md' && extension !== 'html' && extension !== 'htm') return raw
  const root = pathOnly.split('/').filter(Boolean)[0]
  if (!LOCAL_CHINESE_DOC_ROOTS.has(root)) return raw
  return `/zh${pathOnly}${suffix}`
}
