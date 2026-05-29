import { ref } from 'vue'

const visible = ref(false)
const src = ref('')
const alt = ref('')

export function useImagePreviewState() {
  return { visible, src, alt }
}

export function openImagePreview(options: { src: string; alt?: string }) {
  src.value = options.src
  alt.value = options.alt ?? ''
  visible.value = true
  document.body.classList.add('doc-image-preview-open')
}

export function closeImagePreview() {
  visible.value = false
  document.body.classList.remove('doc-image-preview-open')
}
