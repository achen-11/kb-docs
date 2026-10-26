import { useData, useRoute, withBase } from 'vitepress'
import { nextTick, onMounted, watch } from 'vue'
import { resolveLocalizedDocImageSrc } from './doc-image-path.mjs'

function stripBasePrefix(src: string, base: string) {
  if (!base || base === '/') return src
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base
  if (src.startsWith(normalized + '/')) return src.slice(normalized.length)
  if (src === normalized) return '/'
  return src
}

function applyLocalizedDocImages(pathname: string, base: string) {
  const images = document.querySelectorAll('.vp-doc img')

  for (const image of images) {
    if (!(image instanceof HTMLImageElement)) continue

    const rawSrc =
      image.dataset.docImageOriginalSrc ||
      image.getAttribute('src') ||
      image.currentSrc ||
      ''

    if (!rawSrc) continue

    // Persist the site-root-relative original (without DOCS_BASE) once.
    const rootRelative = stripBasePrefix(rawSrc, base)
    if (!image.dataset.docImageOriginalSrc) {
      image.dataset.docImageOriginalSrc = rootRelative.startsWith('/en/')
        ? rootRelative.slice(3) || '/'
        : rootRelative
    }

    const originalSrc = image.dataset.docImageOriginalSrc
    const localizedSrc = withBase(resolveLocalizedDocImageSrc(originalSrc, pathname))
    if (image.getAttribute('src') !== localizedSrc) {
      image.setAttribute('src', localizedSrc)
    }
  }
}

export function useLocalizedDocImages() {
  const route = useRoute()
  const { localeIndex, site } = useData()

  const syncImages = () => {
    nextTick(() => {
      requestAnimationFrame(() => {
        const pathname = localeIndex.value && localeIndex.value !== 'root'
          ? `/${localeIndex.value}/`
          : route.path
        applyLocalizedDocImages(pathname, site.value.base || '/')
      })
    })
  }

  onMounted(() => {
    watch(
      () => [route.path, localeIndex.value] as const,
      () => {
        syncImages()
      },
      { immediate: true }
    )
  })
}
