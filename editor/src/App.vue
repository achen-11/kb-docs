<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import {
  ApiError,
  getBuildStatus,
  getDocument,
  getEditorConfig,
  getPreviewStatus,
  getSession,
  login,
  logout,
  requestStableBuild,
  saveDocument,
  type BuildStatusPayload,
  type DocumentPayload,
  type EditorConfig,
  type PreviewStatusPayload,
} from './api'

const authenticated = ref(false)
const authenticating = ref(false)
const loadingDocument = ref(false)
const saving = ref(false)
const requestingBuild = ref(false)
const token = ref('')
const requestedPath = ref(new URLSearchParams(window.location.search).get('path') || 'docs/index.md')
const editorContent = ref('')
const errorMessage = ref('')
const noticeMessage = ref('')
const previewRefreshKey = ref(0)
const document = shallowRef<DocumentPayload | null>(null)
const conflictDocument = shallowRef<DocumentPayload | null>(null)
const editorConfig = shallowRef<EditorConfig | null>(null)
const previewStatus = shallowRef<PreviewStatusPayload | null>(null)
const buildStatus = shallowRef<BuildStatusPayload>({ status: 'idle', queued: 0 })
const previewFrame = shallowRef<HTMLIFrameElement | null>(null)
const sidebarCollapsed = ref(window.localStorage.getItem('kb-docs-editor-sidebar') !== 'expanded')
let statusTimer: number | undefined
let buildTimer: number | undefined
let documentLoadSequence = 0

const dirty = computed(() => Boolean(document.value && editorContent.value !== document.value.content))
const editorBytes = computed(() => new TextEncoder().encode(editorContent.value).byteLength)
const contentTooLarge = computed(() => editorBytes.value > (editorConfig.value?.maximumDocumentBytes || Infinity))
const canSave = computed(() => dirty.value && !saving.value && !contentTooLarge.value && !conflictDocument.value)
const canBuild = computed(() => Boolean(
  document.value &&
  !saving.value &&
  !requestingBuild.value &&
  !loadingDocument.value &&
  !contentTooLarge.value &&
  !conflictDocument.value &&
  !['queued', 'building'].includes(buildStatus.value.status)
))

const buildLabel = computed(() => {
  const labels: Record<BuildStatusPayload['status'], string> = {
    idle: '稳定预览未构建', draft_saved: '草稿已保存，等待构建', queued: '稳定构建已排队', saving: '正在保存草稿', building: '正在构建稳定预览',
    ready: '稳定预览已更新', error: '草稿已保存，稳定构建失败', conflict: '检测到内容冲突',
  }
  return labels[buildStatus.value.status]
})

const buildTone = computed(() => {
  if (buildStatus.value.status === 'ready') return 'success'
  if (['queued', 'saving', 'building'].includes(buildStatus.value.status)) return 'working'
  if (['error', 'conflict'].includes(buildStatus.value.status)) return 'danger'
  return 'neutral'
})

const documentStats = computed(() => {
  if (!document.value) return ''
  const lines = editorContent.value.split('\n').length
  return `${lines} 行 · ${new Intl.NumberFormat('zh-CN').format(editorBytes.value)} 字节`
})

function documentPreviewPath(sourcePath: string) {
  let value = sourcePath.replace(/^docs\//u, '').replace(/\.md$/u, '')
  if (value === 'index') return '/'
  if (value.endsWith('/index')) value = value.slice(0, -'/index'.length)
  return `/${value}/`
}

const fastPreviewUrl = computed(() => {
  if (!editorConfig.value?.fastPreviewBaseUrl || !document.value) return ''
  const url = new URL(documentPreviewPath(document.value.path), `${editorConfig.value.fastPreviewBaseUrl}/`)
  url.searchParams.set('__editor_view', String(previewRefreshKey.value))
  return url.toString()
})

const stablePreviewUrl = computed(() => {
  if (!editorConfig.value?.stablePreviewBaseUrl || !document.value) return ''
  const url = new URL(documentPreviewPath(document.value.path), `${editorConfig.value.stablePreviewBaseUrl}/`)
  const releaseId = previewStatus.value?.stable.status?.releaseId || buildStatus.value.releaseId
  if (releaseId) url.searchParams.set('__editor_release', releaseId)
  return url.toString()
})

function setError(error: unknown) {
  errorMessage.value = error instanceof Error ? error.message : String(error)
}

function resetMessages() {
  errorMessage.value = ''
  noticeMessage.value = ''
}

async function refreshPreviewStatus() {
  try {
    previewStatus.value = await getPreviewStatus()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    previewStatus.value = {
      fast: { available: false, error: message },
      stable: { available: false, error: message },
    }
  }
}

async function refreshBuildStatus() {
  try {
    const previous = buildStatus.value.status
    buildStatus.value = await getBuildStatus()
    if (['queued', 'building'].includes(previous) && buildStatus.value.status === 'ready') {
      noticeMessage.value = '4175 稳定预览已完成，可以打开进行生产构建核验。'
      await refreshPreviewStatus()
    }
  } catch {
    // Transient polling failures are non-fatal; the next poll retries.
  }
}

function startPolling() {
  window.clearInterval(statusTimer)
  window.clearInterval(buildTimer)
  statusTimer = window.setInterval(refreshPreviewStatus, 10_000)
  buildTimer = window.setInterval(refreshBuildStatus, 1_000)
}

async function initializeWorkspace() {
  editorConfig.value = await getEditorConfig()
  await Promise.all([refreshPreviewStatus(), refreshBuildStatus()])
  startPolling()
  if (requestedPath.value) await openDocument(true)
}

async function submitLogin() {
  if (!token.value) return
  authenticating.value = true
  resetMessages()
  try {
    await login(token.value)
    token.value = ''
    authenticated.value = true
    await initializeWorkspace()
  } catch (error) {
    setError(error)
  } finally {
    authenticating.value = false
  }
}

async function loadDocument(documentPath: string, force = false, source: 'manual' | 'preview' = 'manual') {
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
    const url = new URL(window.location.href)
    url.searchParams.set('path', payload.path)
    window.history.replaceState(null, '', url)
    if (source === 'preview') noticeMessage.value = '已跟随右侧预览切换到对应 Markdown 文档。'
    return true
  } catch (error) {
    if (loadSequence !== documentLoadSequence) return false
    if (source === 'manual') {
      document.value = null
      editorContent.value = ''
    } else if (document.value) {
      requestedPath.value = document.value.path
      previewRefreshKey.value += 1
    }
    setError(error)
    return false
  } finally {
    if (loadSequence === documentLoadSequence) loadingDocument.value = false
  }
}

async function openDocument(force = false) {
  return loadDocument(requestedPath.value, force, 'manual')
}

async function saveDraft() {
  if (!document.value || !canSave.value) return false
  saving.value = true
  resetMessages()
  buildStatus.value = { ...buildStatus.value, status: 'saving', queued: 0, path: document.value.path, error: null }
  try {
    const result = await saveDocument(document.value.path, editorContent.value, document.value.hash)
    document.value = result.document
    editorContent.value = result.document.content
    conflictDocument.value = null
    buildStatus.value = {
      ...buildStatus.value,
      status: 'draft_saved',
      operationId: result.build.operationId,
      path: result.document.path,
      savedAt: result.build.scheduledAt,
      finishedAt: result.build.scheduledAt,
      queued: 0,
      error: null,
    }
    noticeMessage.value = '草稿已保存，4173 正在通过 HMR 更新。稳定预览不会自动构建。'
    window.setTimeout(() => {
      previewRefreshKey.value += 1
    }, 700)
    return true
  } catch (error) {
    if (error instanceof ApiError && error.code === 'DOCUMENT_CONFLICT') {
      conflictDocument.value = error.payload?.document as DocumentPayload
      buildStatus.value = { ...buildStatus.value, status: 'conflict', error: error.message }
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
  if (!document.value) return
  requestingBuild.value = true
  resetMessages()
  try {
    const result = await requestStableBuild(document.value.path)
    buildStatus.value = {
      ...buildStatus.value,
      status: 'queued',
      operationId: result.operationId,
      path: document.value.path,
      savedAt: result.scheduledAt,
      finishedAt: null,
      queued: 1,
      error: null,
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

function reloadFastPreview() {
  previewRefreshKey.value += 1
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  window.localStorage.setItem('kb-docs-editor-sidebar', sidebarCollapsed.value ? 'collapsed' : 'expanded')
}

function handlePreviewRouteMessage(event: MessageEvent) {
  if (!editorConfig.value?.fastPreviewBaseUrl || event.source !== previewFrame.value?.contentWindow) return
  if (event.origin !== new URL(editorConfig.value.fastPreviewBaseUrl).origin) return
  const payload = event.data as { type?: unknown; version?: unknown; sourcePath?: unknown } | null
  if (
    !payload ||
    payload.type !== 'kooboo-docs:preview-route' ||
    payload.version !== 1 ||
    typeof payload.sourcePath !== 'string' ||
    !payload.sourcePath.startsWith('docs/') ||
    !payload.sourcePath.endsWith('.md') ||
    payload.sourcePath === document.value?.path
  ) return
  void loadDocument(payload.sourcePath, false, 'preview')
}

async function signOut() {
  if (dirty.value && !window.confirm('当前文档有未保存修改，确定退出吗？')) return
  await logout().catch(() => undefined)
  authenticated.value = false
  document.value = null
  editorConfig.value = null
  previewStatus.value = null
  window.clearInterval(statusTimer)
  window.clearInterval(buildTimer)
}

function handleKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void saveDraft()
  }
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('message', handlePreviewRouteMessage)
  try {
    const session = await getSession()
    authenticated.value = session.authenticated
    if (session.authenticated) await initializeWorkspace()
  } catch (error) {
    setError(error)
  }
})

onUnmounted(() => {
  window.clearInterval(statusTimer)
  window.clearInterval(buildTimer)
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('message', handlePreviewRouteMessage)
})
</script>

<template>
  <main v-if="!authenticated" class="login-shell">
    <section class="login-card" aria-labelledby="login-title">
      <div class="brand-mark">K</div>
      <p class="eyebrow">KOOBOO DOCS</p>
      <h1 id="login-title">文档编辑平台</h1>
      <p class="login-copy">登录后可编辑 Markdown 草稿，按需构建稳定预览。</p>
      <form @submit.prevent="submitLogin">
        <label for="editor-token">访问口令</label>
        <input id="editor-token" v-model="token" type="password" autocomplete="current-password" placeholder="输入内部访问口令" autofocus />
        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
        <button class="primary-button" type="submit" :disabled="authenticating || !token">{{ authenticating ? '正在验证…' : '进入编辑平台' }}</button>
      </form>
    </section>
  </main>

  <div v-else class="workspace-shell" :class="{ 'sidebar-is-collapsed': sidebarCollapsed }">
    <header class="topbar">
      <div class="topbar-leading">
        <button class="sidebar-toggle" type="button" :aria-expanded="!sidebarCollapsed" aria-controls="editor-tools" @click="toggleSidebar">
          <span aria-hidden="true">{{ sidebarCollapsed ? '›' : '‹' }}</span>
          <span>{{ sidebarCollapsed ? '展开工具' : '收起工具' }}</span>
        </button>
        <div class="brand-lockup">
          <div class="brand-mark brand-mark-small">K</div>
          <div><strong>Kooboo Docs Editor</strong><span>草稿、稳定构建与受控发布</span></div>
        </div>
      </div>
      <div class="topbar-actions">
        <span v-if="dirty" class="dirty-badge">未保存</span>
        <a v-if="editorConfig?.fastPreviewBaseUrl" class="text-link" :href="fastPreviewUrl || editorConfig.fastPreviewBaseUrl" target="_blank" rel="noreferrer">打开快速预览</a>
        <a v-if="editorConfig?.stablePreviewBaseUrl" class="text-link" :href="stablePreviewUrl || editorConfig.stablePreviewBaseUrl" target="_blank" rel="noreferrer">打开稳定预览</a>
        <button class="ghost-button" type="button" @click="signOut">退出</button>
      </div>
    </header>

    <section class="workspace-grid">
      <aside id="editor-tools" class="sidebar-panel">
        <div v-if="sidebarCollapsed" class="sidebar-rail" aria-hidden="true"><span>工具</span></div>
        <div v-else class="sidebar-content">
          <div class="workflow-summary">
            <span class="mode-dot"></span>
            <div><strong>三段式工作流</strong><p>保存草稿只更新 4173；手动构建后更新 4175；线上发布需要单独授权。</p></div>
          </div>

          <form class="path-form" @submit.prevent="openDocument(false)">
            <label for="document-path">Markdown 路径</label>
            <input id="document-path" v-model="requestedPath" spellcheck="false" />
            <p>右侧预览切页时会自动跟随；也可手动输入 {{ editorConfig?.allowedDocumentPattern }}</p>
            <button class="primary-button" type="submit" :disabled="loadingDocument || saving">{{ loadingDocument ? '正在读取…' : '打开文档' }}</button>
          </form>

          <section class="status-card" aria-live="polite">
            <div class="status-heading">
              <span class="status-indicator" :data-tone="buildTone"></span>
              <strong>{{ buildLabel }}</strong>
            </div>
            <dl>
              <div><dt>队列</dt><dd>{{ buildStatus.queued || 0 }}</dd></div>
              <div><dt>稳定 Release</dt><dd>{{ buildStatus.releaseId || previewStatus?.stable.status?.releaseId || '—' }}</dd></div>
              <div><dt>Commit</dt><dd>{{ previewStatus?.stable.status?.sourceCommit || '—' }}</dd></div>
            </dl>
            <p v-if="buildStatus.error" class="status-error build-error">{{ buildStatus.error }}</p>
            <button class="refresh-button" type="button" @click="refreshBuildStatus">刷新状态</button>
          </section>
        </div>
      </aside>

      <section class="workbench">
        <div v-if="errorMessage" class="workspace-error" role="alert">
          <span>{{ errorMessage }}</span>
          <button v-if="conflictDocument" type="button" @click="loadServerVersion">重新加载服务器版本</button>
        </div>
        <div v-if="noticeMessage" class="workspace-notice" role="status">{{ noticeMessage }}</div>

        <div v-if="document" class="document-header">
          <div><p class="eyebrow">MARKDOWN DRAFT</p><h1>{{ document.path }}</h1><p>{{ documentStats }} · 修改于 {{ new Date(document.modifiedAt).toLocaleString('zh-CN') }}</p></div>
          <div class="document-actions">
            <div class="hash-block"><span>SHA-256</span><code>{{ document.hash.slice(0, 16) }}…</code></div>
            <div class="workflow-actions" aria-label="文档操作">
              <button class="save-button" type="button" :disabled="!canSave" @click="saveDraft">{{ saving ? '正在保存…' : '保存草稿' }}</button>
              <button class="build-button" type="button" :disabled="!canBuild" @click="buildStablePreview">{{ requestingBuild ? '正在排队…' : '构建预览' }}</button>
              <button class="publish-button" type="button" disabled :title="editorConfig?.productionPublishAvailable ? '发布功能尚未接入' : 'kbdev 尚未配置生产发布授权'">发布线上</button>
            </div>
            <small>⌘/Ctrl + S 仅保存草稿</small>
          </div>
        </div>

        <div v-if="document" class="editor-preview-grid">
          <div class="editor-pane">
            <div class="pane-label"><strong>Markdown</strong><span :class="{ danger: contentTooLarge }">{{ new Intl.NumberFormat('zh-CN').format(editorBytes) }} / {{ new Intl.NumberFormat('zh-CN').format(editorConfig?.maximumDocumentBytes || 0) }} 字节</span></div>
            <textarea v-model="editorContent" class="source-editor" spellcheck="false" aria-label="Markdown 源文件内容"></textarea>
          </div>
          <div class="preview-pane">
            <div class="pane-label">
              <strong>4173 快速预览</strong>
              <div class="pane-actions"><span>{{ previewStatus?.fast.available ? 'HMR 在线 · 跟随切页' : '不可用' }}</span><button class="refresh-button" type="button" @click="reloadFastPreview">重新加载</button></div>
            </div>
            <iframe v-if="fastPreviewUrl" ref="previewFrame" :key="previewRefreshKey" :src="fastPreviewUrl" title="文档快速预览"></iframe>
          </div>
        </div>

        <div v-else class="empty-state"><div class="empty-glyph">MD</div><h2>选择一个 Markdown 文档</h2><p>从 VitePress 页脚进入时会自动加载对应源文件。</p></div>
      </section>
    </section>
  </div>
</template>
