import { useRoute } from 'vitepress'
import { nextTick, onMounted, watch } from 'vue'
import { resolveLocalizedDocImageSrc } from './doc-image-path.mjs'

function applyLocalizedDocImages(pathname: string) {
  const images = document.querySelectorAll('.vp-doc img')

  for (const image of images) {
    if (!(image instanceof HTMLImageElement)) continue

    const originalSrc =
      image.dataset.docImageOriginalSrc ||
      image.getAttribute('src') ||
      image.currentSrc ||
      ''

    if (!originalSrc) continue

    image.dataset.docImageOriginalSrc = originalSrc

    const localizedSrc = resolveLocalizedDocImageSrc(originalSrc, pathname)
    if (image.getAttribute('src') !== localizedSrc) {
      image.setAttribute('src', localizedSrc)
    }
  }
}

export function useLocalizedDocImages() {
  const route = useRoute()

  const syncImages = () => {
    nextTick(() => {
      requestAnimationFrame(() => {
        applyLocalizedDocImages(route.path)
      })
    })
  }

  onMounted(() => {
    watch(
      () => route.path,
      () => {
        syncImages()
      },
      { immediate: true }
    )
  })
}
