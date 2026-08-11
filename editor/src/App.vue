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
let statusTimer: number | undefined
let buildTimer: number | undefined

const dirty = computed(() => Boolean(document.value && editorContent.value !== document.value.content))
const editorBytes = computed(() => new TextEncoder().encode(editorContent.value).byteLength)
const contentTooLarge = computed(() => editorBytes.value > (editorConfig.value?.maximumDocumentBytes || Infinity))
const canSave = computed(() => dirty.value && !saving.value && !contentTooLarge.value && !conflictDocument.value)

const buildLabel = computed(() => {
  const labels: Record<BuildStatusPayload['status'], string> = {
    idle: '等待编辑', queued: '已进入队列', saving: '正在保存草稿', building: '正在构建预览',
    ready: '预览已更新', error: '草稿已保存，预览失败', conflict: '检测到内容冲突',
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

const previewUrl = computed(() => {
  if (!editorConfig.value?.previewBaseUrl || !document.value) return ''
  const url = new URL(documentPreviewPath(document.value.path), `${editorConfig.value.previewBaseUrl}/`)
  url.searchParams.set('__editor_release', buildStatus.value.releaseId || String(previewRefreshKey.value))
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
    previewStatus.value = { available: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function refreshBuildStatus() {
  try {
    buildStatus.value = await getBuildStatus()
  } catch {
    // The save request reports the terminal error; transient polling failures are non-fatal.
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

async function openDocument(force = false) {
  if (!force && dirty.value && !window.confirm('当前文档有未保存修改，确定放弃并打开其他文档吗？')) return
  loadingDocument.value = true
  resetMessages()
  conflictDocument.value = null
  try {
    const payload = await getDocument(requestedPath.value.trim())
    document.value = payload
    editorContent.value = payload.content
    requestedPath.value = payload.path
    const url = new URL(window.location.href)
    url.searchParams.set('path', payload.path)
    window.history.replaceState(null, '', url)
  } catch (error) {
    document.value = null
    editorContent.value = ''
    setError(error)
  } finally {
    loadingDocument.value = false
  }
}

async function saveDraft() {
  if (!document.value || !canSave.value) return
  saving.value = true
  resetMessages()
  buildStatus.value = { status: 'queued', queued: Math.max(1, buildStatus.value.queued || 0), path: document.value.path }
  try {
    const result = await saveDocument(document.value.path, editorContent.value, document.value.hash)
    document.value = result.document
    editorContent.value = result.document.content
    conflictDocument.value = null
    await refreshBuildStatus()
    if (result.build.status === 'ready') {
      noticeMessage.value = '草稿已保存，4173 预览已更新。'
      buildStatus.value = { ...buildStatus.value, status: 'ready', releaseId: result.build.releaseId || null }
      previewRefreshKey.value += 1
      await refreshPreviewStatus()
    } else {
      noticeMessage.value = '草稿已保存，但本次预览构建失败；4173 仍显示上一个成功版本。'
      buildStatus.value = { ...buildStatus.value, status: 'error', error: result.build.error || null }
    }
  } catch (error) {
    if (error instanceof ApiError && error.code === 'DOCUMENT_CONFLICT') {
      conflictDocument.value = error.payload?.document as DocumentPayload
      buildStatus.value = { ...buildStatus.value, status: 'conflict', error: error.message }
    }
    setError(error)
  } finally {
    saving.value = false
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
})
</script>

<template>
  <main v-if="!authenticated" class="login-shell">
    <section class="login-card" aria-labelledby="login-title">
      <div class="brand-mark">K</div>
      <p class="eyebrow">KOOBOO DOCS</p>
      <h1 id="login-title">文档编辑平台</h1>
      <p class="login-copy">登录后可编辑 Markdown 草稿，并自动构建内网预览。</p>
      <form @submit.prevent="submitLogin">
        <label for="editor-token">访问口令</label>
        <input id="editor-token" v-model="token" type="password" autocomplete="current-password" placeholder="输入内部访问口令" autofocus />
        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
        <button class="primary-button" type="submit" :disabled="authenticating || !token">{{ authenticating ? '正在验证…' : '进入编辑平台' }}</button>
      </form>
    </section>
  </main>

  <div v-else class="workspace-shell">
    <header class="topbar">
      <div class="brand-lockup">
        <div class="brand-mark brand-mark-small">K</div>
        <div><strong>Kooboo Docs Editor</strong><span>共享草稿与自动预览</span></div>
      </div>
      <div class="topbar-actions">
        <span v-if="dirty" class="dirty-badge">未保存</span>
        <a v-if="editorConfig?.previewBaseUrl" class="text-link" :href="previewUrl || editorConfig.previewBaseUrl" target="_blank" rel="noreferrer">打开预览站</a>
        <button class="ghost-button" type="button" @click="signOut">退出</button>
      </div>
    </header>

    <section class="workspace-grid">
      <aside class="sidebar-panel">
        <div class="mode-banner">
          <span class="mode-dot"></span>
          <div><strong>共享草稿模式</strong><p>保存会写入服务器工作区并触发生产构建，不会提交 Git。</p></div>
        </div>

        <form class="path-form" @submit.prevent="openDocument(false)">
          <label for="document-path">Markdown 路径</label>
          <input id="document-path" v-model="requestedPath" spellcheck="false" />
          <p>允许范围：{{ editorConfig?.allowedDocumentPattern }}</p>
          <button class="primary-button" type="submit" :disabled="loadingDocument || saving">{{ loadingDocument ? '正在读取…' : '打开文档' }}</button>
        </form>

        <section class="status-card" aria-live="polite">
          <div class="status-heading">
            <span class="status-indicator" :data-tone="buildTone"></span>
            <strong>{{ buildLabel }}</strong>
          </div>
          <dl>
            <div><dt>队列</dt><dd>{{ buildStatus.queued || 0 }}</dd></div>
            <div><dt>Release</dt><dd>{{ buildStatus.releaseId || previewStatus?.status?.releaseId || '—' }}</dd></div>
            <div><dt>Commit</dt><dd>{{ previewStatus?.status?.sourceCommit || '—' }}</dd></div>
          </dl>
          <p v-if="buildStatus.error" class="status-error build-error">{{ buildStatus.error }}</p>
          <button class="refresh-button" type="button" @click="refreshBuildStatus">刷新状态</button>
        </section>
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
            <button class="save-button" type="button" :disabled="!canSave" @click="saveDraft">{{ saving ? buildLabel : '保存并更新预览' }}</button>
            <small>⌘/Ctrl + S</small>
          </div>
        </div>

        <div v-if="document" class="editor-preview-grid">
          <div class="editor-pane">
            <div class="pane-label"><strong>Markdown</strong><span :class="{ danger: contentTooLarge }">{{ new Intl.NumberFormat('zh-CN').format(editorBytes) }} / {{ new Intl.NumberFormat('zh-CN').format(editorConfig?.maximumDocumentBytes || 0) }} 字节</span></div>
            <textarea v-model="editorContent" class="source-editor" spellcheck="false" aria-label="Markdown 源文件内容"></textarea>
          </div>
          <div class="preview-pane">
            <div class="pane-label"><strong>4173 预览</strong><span>{{ previewStatus?.available ? '在线' : '不可用' }}</span></div>
            <iframe v-if="previewUrl" :key="`${previewRefreshKey}-${buildStatus.releaseId || ''}`" :src="previewUrl" title="文档预览"></iframe>
          </div>
        </div>

        <div v-else class="empty-state"><div class="empty-glyph">MD</div><h2>选择一个 Markdown 文档</h2><p>从 VitePress 页脚进入时会自动加载对应源文件。</p></div>
      </section>
    </section>
  </div>
</template>
