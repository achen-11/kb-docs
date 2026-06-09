const ENGLISH_DOC_PREFIX = '/en'
const LOCALIZED_CMS_IMAGE_PREFIX = '/cms/'

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

  if (src.startsWith(LOCALIZED_CMS_IMAGE_PREFIX)) {
    return `/en${src}`
  }

  return src
}
