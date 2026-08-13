import { onMounted, watch } from 'vue'
import { useData, useRoute } from 'vitepress'

export const EDITOR_ROUTE_MESSAGE = 'kooboo-docs:preview-route'

export function useEditorRouteSync() {
  const { page } = useData()
  const route = useRoute()

  function notifyEditor() {
    if (typeof window === 'undefined' || window.parent === window) return
    const relativePath = page.value.relativePath
    if (page.value.isNotFound) {
      window.parent.postMessage({
        type: EDITOR_ROUTE_MESSAGE,
        version: 2,
        status: 'not-found',
        routePath: route.path,
      }, '*')
      return
    }
    if (!relativePath || !relativePath.endsWith('.md')) return
    window.parent.postMessage({
      type: EDITOR_ROUTE_MESSAGE,
      version: 2,
      status: 'ready',
      sourcePath: `docs/${relativePath}`,
    }, '*')
  }

  watch(() => [page.value.relativePath, page.value.isNotFound, route.path], notifyEditor)
  onMounted(notifyEditor)
}
