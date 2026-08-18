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

export const PUBLISHED_VERIFY_PATHS = '/,/cms/index.html,/api/utils/ip.html'

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
