import { onMounted, watch } from 'vue'
import { useData } from 'vitepress'

export const EDITOR_ROUTE_MESSAGE = 'kooboo-docs:preview-route'

export function useEditorRouteSync() {
  const { page } = useData()

  function notifyEditor() {
    if (typeof window === 'undefined' || window.parent === window) return
    const relativePath = page.value.relativePath
    if (!relativePath || !relativePath.endsWith('.md')) return
    window.parent.postMessage({
      type: EDITOR_ROUTE_MESSAGE,
      version: 1,
      sourcePath: `docs/${relativePath}`,
    }, '*')
  }

  watch(() => page.value.relativePath, notifyEditor)
  onMounted(notifyEditor)
}
