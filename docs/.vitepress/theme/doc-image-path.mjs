const ENGLISH_DOC_PREFIX = '/en'
const LOCALIZED_DOC_IMAGE_PREFIXES = ['/cms/', '/product/']

export function isEnglishDocRoute(pathname = '/') {
  return pathname === ENGLISH_DOC_PREFIX || pathname.startsWith(`${ENGLISH_DOC_PREFIX}/`)
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
