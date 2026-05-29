import { onMounted, onUnmounted } from 'vue'
import { openImagePreview } from './use-image-preview'

function isPreviewableImage(target: EventTarget | null): target is HTMLImageElement {
  if (!(target instanceof HTMLImageElement)) return false
  if (!target.closest('.vp-doc')) return false
  if (target.classList.contains('no-zoom')) return false
  return true
}

/**
 * 正文区 Markdown 图片点击预览（不含 DocImage，由组件自身 @click 处理）。
 * 使用 document 冒泡，避免 capture + stopPropagation 拦截组件点击。
 */
export function useDocImagePreview() {
  const onDocClick = (event: MouseEvent) => {
    if (!isPreviewableImage(event.target)) return
    if (event.target.classList.contains('doc-image')) return

    openImagePreview({
      src: event.target.currentSrc || event.target.src,
      alt: event.target.alt
    })
  }

  onMounted(() => {
    document.addEventListener('click', onDocClick)
  })

  onUnmounted(() => {
    document.removeEventListener('click', onDocClick)
  })
}
