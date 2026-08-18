import { isEnglishDocRoute as isPublishedEnglishRoute } from '../../../scripts/docs-publish-locale.mjs'

const ENGLISH_DOC_PREFIX = '/en'
const LOCALIZED_DOC_IMAGE_PREFIXES = ['/cms/', '/product/']

export function isEnglishDocRoute(pathname = '/') {
  const pathOnly = String(pathname || '/').split('?')[0]
  if (pathOnly === ENGLISH_DOC_PREFIX || pathOnly.startsWith(`${ENGLISH_DOC_PREFIX}/`)) {
    return true
  }
  return isPublishedEnglishRoute(pathOnly)
}

export function resolveLocalizedDocImageSrc(src, pathname = '/') {
  if (typeof src !== 'string' || src.length === 0) {
    return src
  }

  if (src.startsWith('/en/')) {
    return src
  }

  if (!isEnglishDocRoute(pathname)) {
    return src
  }

  if (LOCALIZED_DOC_IMAGE_PREFIXES.some((prefix) => src.startsWith(prefix))) {
    return `/en${src}`
  }

  return src
}
