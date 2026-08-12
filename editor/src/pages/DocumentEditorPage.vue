<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ApiError,
  getDocument,
  requestStableBuild,
  saveDocument,
  type DocumentPayload,
} from '../api'
import { useWorkspace } from '../app/workspace'
import MediaBrowser from '../components/MediaBrowser.vue'
import type { MediaItemPayload } from '../api'

const route = useRoute()
const router = useRouter()
const workspace = useWorkspace()
const loadingDocument = ref(false)
const saving = ref(false)
const requestingBuild = ref(false)
const requestedPath = ref(typeof route.query.path === 'string' ? route.query.path : 'docs/index.md')
const editorContent = ref('')
const errorMessage = ref('')
const noticeMessage = ref('')
const previewRefreshKey = ref(0)
const document = shallowRef<DocumentPayload | null>(null)
const conflictDocument = shallowRef<DocumentPayload | null>(null)
const previewFrame = shallowRef<HTMLIFrameElement | null>(null)
const editorPreviewGrid = shallowRef<HTMLElement | null>(null)
const previewCanvas = shallowRef<HTMLElement | null>(null)
const splitPercent = ref(Number.parseFloat(window.localStorage.getItem('kb-docs-editor-split') || '50'))
const resizingPanels = ref(false)
const pathPickerOpen = ref(false)
const mediaPickerOpen = ref(false)
const sourceEditor = shallowRef<HTMLTextAreaElement | null>(null)
const savedSelection = ref({ start: 0, end: 0 })
const mediaAlt = ref('')
const mediaSyntax = ref<'doc-image' | 'markdown'>('doc-image')
type PreviewDevice = 'responsive' | 'desktop' | 'tablet' | 'tablet-landscape' | 'mobile'
interface PreviewDevicePreset { id: PreviewDevice; label: string; width: number | null; height: number | null }
const previewDevices: PreviewDevicePreset[] = [
  { id: 'desktop', label: 'PC · 1440 × 900', width: 1440, height: 900 },
  { id: 'tablet', label: '平板 · 768 × 1024', width: 768, height: 1024 },
  { id: 'tablet-landscape', label: '平板横屏 · 1024 × 768', width: 1024, height: 768 },
  { id: 'mobile', label: '手机 · 390 × 844', width: 390, height: 844 },
  { id: 'responsive', label: '自适应', width: null, height: null },
]
const storedPreviewDevice = window.localStorage.getItem('kb-docs-editor-device') as PreviewDevice | null
const previewDevice = ref<PreviewDevice>(previewDevices.some((item) => item.id === storedPreviewDevice) ? storedPreviewDevice! : 'desktop')
const previewCanvasSize = ref({ width: 0, height: 0 })
let documentLoadSequence = 0
let previewResizeObserver: ResizeObserver | undefined

const dirty = computed(() => Boolean(document.value && editorContent.value !== document.value.content))
const editorBytes = computed(() => new TextEncoder().encode(editorContent.value).byteLength)
const contentTooLarge = computed(() => editorBytes.value > (workspace.editorConfig.value?.maximumDocumentBytes || Infinity))
const canSave = computed(() => dirty.value && !saving.value && !contentTooLarge.value && !conflictDocument.value && !workspace.workspaceStatus.value?.pendingPush)
const canBuild = computed(() => Boolean(
  document.value && !saving.value && !requestingBuild.value && !loadingDocument.value &&
  !contentTooLarge.value && !conflictDocument.value &&
  !['queued', 'building'].includes(workspace.buildStatus.value.status)
))
const activePreviewDevice = computed(() => previewDevices.find((item) => item.id === previewDevice.value) || previewDevices[0])
const editorPreviewGridStyle = computed(() => ({
  gridTemplateColumns: `minmax(320px, ${splitPercent.value}fr) 14px minmax(360px, ${100 - splitPercent.value}fr)`,
}))
const previewScale = computed(() => {
  const preset = activePreviewDevice.value
  if (!preset.width || !preset.height) return 1
  const availableWidth = Math.max(1, previewCanvasSize.value.width - 32)
  const availableHeight = Math.max(1, previewCanvasSize.value.height - 32)
  return Math.min(1, availableWidth / preset.width, availableHeight / preset.height)
})
const previewStageStyle = computed(() => {
  const preset = activePreviewDevice.value
  if (!preset.width || !preset.height) return undefined
  return { width: `${Math.round(preset.width * previewScale.value)}px`, height: `${Math.round(preset.height * previewScale.value)}px` }
})
const previewFrameStyle = computed(() => {
  const preset = activePreviewDevice.value
  if (!preset.width || !preset.height) return undefined
  return { width: `${preset.width}px`, height: `${preset.height}px`, transform: `scale(${previewScale.value})` }
})
const buildLabel = computed(() => {
  const labels = {
    idle: '稳定预览未构建', draft_saved: '草稿已保存，等待构建', queued: '稳定构建已排队', saving: '正在保存草稿', building: '正在构建稳定预览',
    ready: '稳定预览已更新', error: '草稿已保存，稳定构建失败', conflict: '检测到内容冲突',
  }
  return labels[workspace.buildStatus.value.status]
})
const buildTone = computed(() => {
  if (workspace.buildStatus.value.status === 'ready') return 'success'
  if (['queued', 'saving', 'building'].includes(workspace.buildStatus.value.status)) return 'working'
  if (['error', 'conflict'].includes(workspace.buildStatus.value.status)) return 'danger'
  return 'neutral'
})
const documentStats = computed(() => document.value
  ? `${editorContent.value.split('\n').length} 行 · ${new Intl.NumberFormat('zh-CN').format(editorBytes.value)} 字节`
  : '')

function documentPreviewPath(sourcePath: string) {
  let value = sourcePath.replace(/^docs\//u, '').replace(/\.md$/u, '')
  if (value === 'index') return '/'
  if (value.endsWith('/index')) value = value.slice(0, -'/index'.length)
  return `/${value}/`
}

const fastPreviewUrl = computed(() => {
  if (!workspace.editorConfig.value?.fastPreviewBaseUrl || !document.value) return ''
  const url = new URL(documentPreviewPath(document.value.path), `${workspace.editorConfig.value.fastPreviewBaseUrl}/`)
  url.searchParams.set('__editor_view', String(previewRefreshKey.value))
  return url.toString()
})
const stablePreviewUrl = computed(() => {
  if (!workspace.editorConfig.value?.stablePreviewBaseUrl || !document.value) return ''
  const url = new URL(documentPreviewPath(document.value.path), `${workspace.editorConfig.value.stablePreviewBaseUrl}/`)
  if (workspace.stableReleaseId.value) url.searchParams.set('__editor_release', workspace.stableReleaseId.value)
  return url.toString()
})

function setError(error: unknown) { errorMessage.value = error instanceof Error ? error.message : String(error) }
function resetMessages() { errorMessage.value = ''; noticeMessage.value = '' }

async function loadDocument(documentPath: string, force = false, source: 'manual' | 'preview' | 'route' = 'manual') {
  if (!force && dirty.value && !window.confirm('当前文档有未保存修改，确定放弃并打开其他文档吗？')) {
    if (source === 'preview') {
      previewRefreshKey.value += 1
      noticeMessage.value = '已保留当前未保存内容，并将右侧预览切回当前文档。'
    }
    return false
  }
  const loadSequence = ++documentLoadSequence
  loadingDocument.value = true
  resetMessages()
  conflictDocument.value = null
  try {
    const payload = await getDocument(documentPath.trim())
    if (loadSequence !== documentLoadSequence) return false
    document.value = payload
    editorContent.value = payload.content
    requestedPath.value = payload.path
    if (route.query.path !== payload.path) {
      await router.replace({ name: 'editor', query: { path: payload.path } })
    }
    if (source === 'preview') noticeMessage.value = '已跟随右侧预览切换到对应 Markdown 文档。'
    pathPickerOpen.value = false
    return true
  } catch (error) {
    if (loadSequence !== documentLoadSequence) return false
    if (source !== 'preview') { document.value = null; editorContent.value = '' }
    else if (document.value) { requestedPath.value = document.value.path; previewRefreshKey.value += 1 }
    setError(error)
    return false
  } finally {
    if (loadSequence === documentLoadSequence) loadingDocument.value = false
  }
}

async function openDocument(force = false) { return loadDocument(requestedPath.value, force, 'manual') }

async function saveDraft() {
  if (!document.value || !canSave.value) return false
  saving.value = true
  resetMessages()
  workspace.buildStatus.value = { ...workspace.buildStatus.value, status: 'saving', queued: 0, path: document.value.path, error: null }
  try {
    const result = await saveDocument(document.value.path, editorContent.value, document.value.hash)
    document.value = result.document
    editorContent.value = result.document.content
    conflictDocument.value = null
    workspace.buildStatus.value = {
      ...workspace.buildStatus.value, status: 'draft_saved', operationId: result.build.operationId,
      path: result.document.path, savedAt: result.build.scheduledAt, finishedAt: result.build.scheduledAt, queued: 0, error: null,
    }
    await workspace.refreshWorkspaceStatus()
    noticeMessage.value = '草稿已保存，4173 正在更新；改动尚未提交 Git，自动同步已暂停。'
    window.setTimeout(() => { previewRefreshKey.value += 1 }, 700)
    return true
  } catch (error) {
    if (error instanceof ApiError && error.code === 'DOCUMENT_CONFLICT') {
      conflictDocument.value = error.payload?.document as unknown as DocumentPayload
      workspace.buildStatus.value = { ...workspace.buildStatus.value, status: 'conflict', error: error.message }
    }
    setError(error)
    return false
  } finally {
    saving.value = false
  }
}

async function buildStablePreview() {
  if (!document.value || !canBuild.value) return
  if (dirty.value && !await saveDraft()) return
  requestingBuild.value = true
  resetMessages()
  try {
    const result = await requestStableBuild(document.value.path)
    workspace.buildStatus.value = {
      ...workspace.buildStatus.value, status: 'queued', operationId: result.operationId,
      path: document.value.path, savedAt: result.scheduledAt, finishedAt: null, queued: 1, error: null,
    }
    noticeMessage.value = '稳定构建已开始。完成后会切换 4175 的不可变预览。'
  } catch (error) {
    setError(error)
  } finally {
    requestingBuild.value = false
  }
}

function loadServerVersion() {
  if (!conflictDocument.value) return
  document.value = conflictDocument.value
  editorContent.value = conflictDocument.value.content
  conflictDocument.value = null
  errorMessage.value = ''
  noticeMessage.value = '已加载服务器最新版本。此前未保存的本地内容已被替换。'
}
function reloadFastPreview() { previewRefreshKey.value += 1 }
function clampSplitPercent(clientX: number) {
  const grid = editorPreviewGrid.value
  if (!grid) return
  const rect = grid.getBoundingClientRect()
  const usableWidth = Math.max(1, rect.width - 14)
  const minimum = Math.min(48, Math.max(20, 320 / usableWidth * 100))
  const maximum = Math.max(52, Math.min(80, 100 - 360 / usableWidth * 100))
  splitPercent.value = Math.min(maximum, Math.max(minimum, (clientX - rect.left) / usableWidth * 100))
}
function stopPanelResize() {
  if (!resizingPanels.value) return
  resizingPanels.value = false
  window.localStorage.setItem('kb-docs-editor-split', splitPercent.value.toFixed(2))
  window.removeEventListener('pointermove', handlePanelPointerMove)
  window.removeEventListener('pointerup', stopPanelResize)
  window.removeEventListener('pointercancel', stopPanelResize)
}
function handlePanelPointerMove(event: PointerEvent) { clampSplitPercent(event.clientX) }
function startPanelResize(event: PointerEvent) {
  if (window.matchMedia('(max-width: 820px)').matches) return
  event.preventDefault(); resizingPanels.value = true; clampSplitPercent(event.clientX)
  window.addEventListener('pointermove', handlePanelPointerMove)
  window.addEventListener('pointerup', stopPanelResize)
  window.addEventListener('pointercancel', stopPanelResize)
}
function handlePanelResizeKeydown(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  if (event.key === 'Home') splitPercent.value = 30
  else if (event.key === 'End') splitPercent.value = 70
  else splitPercent.value = Math.min(70, Math.max(30, splitPercent.value + (event.key === 'ArrowLeft' ? -2 : 2)))
  window.localStorage.setItem('kb-docs-editor-split', splitPercent.value.toFixed(2))
}
function updatePreviewCanvasSize(element = previewCanvas.value) {
  if (element) previewCanvasSize.value = { width: element.clientWidth, height: element.clientHeight }
}
function handlePreviewRouteMessage(event: MessageEvent) {
  if (!workspace.editorConfig.value?.fastPreviewBaseUrl || event.source !== previewFrame.value?.contentWindow) return
  if (event.origin !== new URL(workspace.editorConfig.value.fastPreviewBaseUrl).origin) return
  const payload = event.data as { type?: unknown; version?: unknown; sourcePath?: unknown } | null
  if (!payload || payload.type !== 'kooboo-docs:preview-route' || payload.version !== 1 ||
    typeof payload.sourcePath !== 'string' || !payload.sourcePath.startsWith('docs/') ||
    !payload.sourcePath.endsWith('.md') || payload.sourcePath === document.value?.path) return
  void loadDocument(payload.sourcePath, false, 'preview')
}
function handleKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void saveDraft() }
}
function rememberSelection() {
  const editor = sourceEditor.value
  if (editor) savedSelection.value = { start: editor.selectionStart, end: editor.selectionEnd }
}
function openMediaPicker() {
  rememberSelection()
  mediaPickerOpen.value = true
}
async function insertMedia(item: MediaItemPayload) {
  const fallbackAlt = item.name.replace(/\.[^.]+$/u, '').replace(/[-_]+/gu, ' ')
  const alt = mediaAlt.value.trim() || fallbackAlt
  const reference = mediaSyntax.value === 'markdown'
    ? `![${alt}](${item.url})`
    : `<DocImage src="${item.url}" alt="${alt}" />`
  const { start, end } = savedSelection.value
  const before = editorContent.value.slice(0, start)
  const after = editorContent.value.slice(end)
  const prefix = before && !before.endsWith('\n') ? '\n' : ''
  const suffix = after && !after.startsWith('\n') ? '\n' : ''
  editorContent.value = `${before}${prefix}${reference}${suffix}${after}`
  const cursor = start + prefix.length + reference.length
  savedSelection.value = { start: cursor, end: cursor }
  mediaPickerOpen.value = false
  mediaAlt.value = ''
  await nextTick()
  sourceEditor.value?.focus()
  sourceEditor.value?.setSelectionRange(cursor, cursor)
  noticeMessage.value = '图片引用已插入，按 ⌘/Ctrl + S 保存草稿后即可在 4173 查看。'
}
function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return
  event.preventDefault(); event.returnValue = ''
}

watch(() => route.query.path, (value) => {
  if (typeof value === 'string' && value !== document.value?.path) {
    requestedPath.value = value
    void loadDocument(value, false, 'route')
  }
})
watch(previewCanvas, (element) => {
  previewResizeObserver?.disconnect(); previewResizeObserver = undefined
  if (!element) return
  updatePreviewCanvasSize(element)
  previewResizeObserver = new ResizeObserver(() => updatePreviewCanvasSize(element))
  previewResizeObserver.observe(element)
})
watch(previewDevice, (value) => window.localStorage.setItem('kb-docs-editor-device', value))
watch(() => workspace.buildStatus.value.status, (status, previous) => {
  if (['queued', 'building'].includes(previous) && status === 'ready') {
    noticeMessage.value = '4175 稳定预览已完成，可以打开核对生产构建结果。'
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('message', handlePreviewRouteMessage)
  void openDocument(true)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('message', handlePreviewRouteMessage)
  previewResizeObserver?.disconnect(); stopPanelResize()
})
</script>

<template>
  <div class="document-editor-page">
    <header class="editor-commandbar">
      <div class="editor-identity">
        <p><RouterLink to="/">工作台</RouterLink><span>/</span>文档编辑</p>
        <div class="editor-title-line">
          <h1>{{ document?.path || requestedPath }}</h1>
          <button class="path-button" type="button" @click="pathPickerOpen = !pathPickerOpen">切换文档</button>
        </div>
        <span v-if="document">{{ documentStats }} · 修改于 {{ new Date(document.modifiedAt).toLocaleString('zh-CN') }}</span>
      </div>
      <div class="editor-actions">
        <div v-if="document" class="hash-block"><span>SHA-256</span><code>{{ document.hash.slice(0, 12) }}…</code></div>
        <button class="media-picker-button" type="button" :disabled="!document" @click="openMediaPicker">插入图片</button>
        <button class="save-button" type="button" :disabled="!canSave" @click="saveDraft">{{ saving ? '正在保存…' : '保存草稿' }}</button>
        <button class="build-button" type="button" :disabled="!canBuild" @click="buildStablePreview">{{ requestingBuild ? '正在排队…' : '构建预览' }}</button>
        <RouterLink class="submit-change-link" to="/workflow">查看改动</RouterLink>
      </div>
      <form v-if="pathPickerOpen" class="editor-path-picker" @submit.prevent="openDocument(false)">
        <label for="document-path">Markdown 路径</label>
        <input id="document-path" v-model="requestedPath" spellcheck="false" />
        <button class="primary-button" type="submit" :disabled="loadingDocument">{{ loadingDocument ? '正在读取…' : '打开文档' }}</button>
      </form>
    </header>

    <div class="editor-statebar">
      <span><i :data-tone="workspace.previewStatus.value?.fast.available ? 'success' : 'danger'"></i>4173 {{ workspace.previewStatus.value?.fast.available ? 'HMR 在线' : '不可用' }}</span>
      <span><i :data-tone="buildTone"></i>{{ buildLabel }}</span>
      <span v-if="workspace.hasDraft.value" class="git-paused"><i data-tone="warning"></i>草稿尚未提交 Git · 自动同步暂停</span>
      <a v-if="stablePreviewUrl" :href="stablePreviewUrl" target="_blank" rel="noreferrer">打开 4175</a>
      <small>⌘/Ctrl + S 仅保存草稿</small>
    </div>
    <div v-if="workspace.workspaceStatus.value?.pendingPush" class="workspace-error" role="alert"><span>已有版本等待推送，新的草稿保存已暂停。请先进入“改动与发布”重试推送。</span><RouterLink to="/workflow">处理待推送版本</RouterLink></div>

    <div v-if="errorMessage" class="workspace-error" role="alert"><span>{{ errorMessage }}</span><button v-if="conflictDocument" type="button" @click="loadServerVersion">重新加载服务器版本</button></div>
    <div v-if="noticeMessage" class="workspace-notice" role="status">{{ noticeMessage }}</div>

    <div v-if="document" ref="editorPreviewGrid" class="editor-preview-grid" :class="{ 'is-resizing': resizingPanels }" :style="editorPreviewGridStyle">
      <section class="editor-pane">
        <header class="pane-label"><strong>Markdown</strong><span :class="{ danger: contentTooLarge }">{{ new Intl.NumberFormat('zh-CN').format(editorBytes) }} / {{ new Intl.NumberFormat('zh-CN').format(workspace.editorConfig.value?.maximumDocumentBytes || 0) }} 字节</span></header>
        <textarea ref="sourceEditor" v-model="editorContent" class="source-editor" spellcheck="false" aria-label="Markdown 源文件内容" @click="rememberSelection" @keyup="rememberSelection" @select="rememberSelection"></textarea>
      </section>
      <div class="panel-resizer" role="separator" aria-label="调整编辑区与预览区宽度" aria-orientation="vertical" :aria-valuenow="Math.round(splitPercent)" aria-valuemin="30" aria-valuemax="70" tabindex="0" @pointerdown="startPanelResize" @keydown="handlePanelResizeKeydown"><span aria-hidden="true"></span></div>
      <section class="preview-pane">
        <header class="pane-label">
          <strong>4173 快速预览</strong>
          <div class="pane-actions">
            <label class="viewport-control" aria-label="预览设备视口">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.75 4.75h16.5v11.5H3.75zM9 20h6M12 16.25V20" /></svg>
              <select v-model="previewDevice"><option v-for="device in previewDevices" :key="device.id" :value="device.id">{{ device.label }}</option></select>
            </label>
            <span>{{ workspace.previewStatus.value?.fast.available ? '跟随切页' : '不可用' }}</span>
            <button class="refresh-button" type="button" @click="reloadFastPreview">重新加载</button>
          </div>
        </header>
        <div ref="previewCanvas" class="preview-canvas" :class="{ 'is-responsive': previewDevice === 'responsive' }">
          <div class="preview-device-stage" :style="previewStageStyle">
            <iframe v-if="fastPreviewUrl" ref="previewFrame" :key="previewRefreshKey" :src="fastPreviewUrl" :style="previewFrameStyle" title="文档快速预览"></iframe>
          </div>
        </div>
      </section>
    </div>
    <div v-else class="empty-state"><div class="empty-glyph">MD</div><h2>{{ loadingDocument ? '正在读取文档' : '无法打开 Markdown 文档' }}</h2><p>检查路径是否属于 {{ workspace.editorConfig.value?.allowedDocumentPattern || 'docs/**/*.md' }}。</p></div>
    <Teleport to="body">
      <div v-if="mediaPickerOpen" class="media-picker-backdrop" @click.self="mediaPickerOpen = false">
        <aside class="media-picker-drawer" aria-label="插入图片">
          <header><div><p class="section-kicker">插入到当前光标</p><h2>选择或上传图片</h2></div><button type="button" aria-label="关闭" @click="mediaPickerOpen = false">×</button></header>
          <div class="media-insert-options"><label>替代文字<input v-model="mediaAlt" placeholder="留空则使用文件名" /></label><label>插入格式<select v-model="mediaSyntax"><option value="doc-image">DocImage 组件</option><option value="markdown">Markdown 图片</option></select></label></div>
          <MediaBrowser compact select-label="插入当前文档" @select="insertMedia" />
        </aside>
      </div>
    </Teleport>
  </div>
</template>
