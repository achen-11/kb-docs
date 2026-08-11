<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import {
  getDocument,
  getEditorConfig,
  getPreviewStatus,
  getSession,
  login,
  logout,
  type DocumentPayload,
  type EditorConfig,
  type PreviewStatusPayload,
} from './api'

const authenticated = ref(false)
const authenticating = ref(false)
const loadingDocument = ref(false)
const token = ref('')
const requestedPath = ref(new URLSearchParams(window.location.search).get('path') || 'docs/index.md')
const errorMessage = ref('')
const document = shallowRef<DocumentPayload | null>(null)
const editorConfig = shallowRef<EditorConfig | null>(null)
const previewStatus = shallowRef<PreviewStatusPayload | null>(null)
let statusTimer: number | undefined

const statusLabel = computed(() => {
  if (!previewStatus.value) return '状态未知'
  if (!previewStatus.value.available) return '预览不可用'
  const status = previewStatus.value.status?.status
  if (status === 'ready') return '预览已就绪'
  if (status === 'building') return '正在构建'
  if (status === 'degraded') return '预览降级'
  return status || '状态未知'
})

const statusTone = computed(() => {
  const status = previewStatus.value?.status?.status
  if (status === 'ready') return 'success'
  if (status === 'building') return 'working'
  return 'warning'
})

const documentStats = computed(() => {
  if (!document.value) return ''
  const lines = document.value.content.split('\n').length
  const size = new Intl.NumberFormat('zh-CN').format(document.value.bytes)
  return `${lines} 行 · ${size} 字节`
})

function setError(error: unknown) {
  errorMessage.value = error instanceof Error ? error.message : String(error)
}

async function refreshPreviewStatus() {
  try {
    previewStatus.value = await getPreviewStatus()
  } catch (error) {
    previewStatus.value = {
      available: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function initializeWorkspace() {
  editorConfig.value = await getEditorConfig()
  await refreshPreviewStatus()
  window.clearInterval(statusTimer)
  statusTimer = window.setInterval(refreshPreviewStatus, 10_000)
  if (requestedPath.value) await openDocument()
}

async function submitLogin() {
  if (!token.value) return
  authenticating.value = true
  errorMessage.value = ''
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

async function openDocument() {
  loadingDocument.value = true
  errorMessage.value = ''
  try {
    const payload = await getDocument(requestedPath.value.trim())
    document.value = payload
    const url = new URL(window.location.href)
    url.searchParams.set('path', payload.path)
    window.history.replaceState(null, '', url)
  } catch (error) {
    document.value = null
    setError(error)
  } finally {
    loadingDocument.value = false
  }
}

async function signOut() {
  await logout().catch(() => undefined)
  authenticated.value = false
  document.value = null
  editorConfig.value = null
  previewStatus.value = null
  window.clearInterval(statusTimer)
}

onMounted(async () => {
  try {
    const session = await getSession()
    authenticated.value = session.authenticated
    if (session.authenticated) await initializeWorkspace()
  } catch (error) {
    setError(error)
  }
})

onUnmounted(() => window.clearInterval(statusTimer))
</script>

<template>
  <main v-if="!authenticated" class="login-shell">
    <section class="login-card" aria-labelledby="login-title">
      <div class="brand-mark">K</div>
      <p class="eyebrow">KOOBOO DOCS</p>
      <h1 id="login-title">文档编辑平台</h1>
      <p class="login-copy">登录后可从文档站直接打开对应 Markdown 源文件。Phase 2 仅提供只读检查。</p>
      <form @submit.prevent="submitLogin">
        <label for="editor-token">访问口令</label>
        <input
          id="editor-token"
          v-model="token"
          type="password"
          autocomplete="current-password"
          placeholder="输入内部访问口令"
          autofocus
        />
        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
        <button class="primary-button" type="submit" :disabled="authenticating || !token">
          {{ authenticating ? '正在验证…' : '进入编辑平台' }}
        </button>
      </form>
    </section>
  </main>

  <div v-else class="workspace-shell">
    <header class="topbar">
      <div class="brand-lockup">
        <div class="brand-mark brand-mark-small">K</div>
        <div>
          <strong>Kooboo Docs Editor</strong>
          <span>内部文档工作台</span>
        </div>
      </div>
      <div class="topbar-actions">
        <a
          v-if="editorConfig?.previewBaseUrl"
          class="text-link"
          :href="editorConfig.previewBaseUrl"
          target="_blank"
          rel="noreferrer"
        >打开预览站</a>
        <button class="ghost-button" type="button" @click="signOut">退出</button>
      </div>
    </header>

    <section class="workspace-grid">
      <aside class="sidebar-panel">
        <div class="mode-banner">
          <span class="mode-dot"></span>
          <div>
            <strong>只读模式</strong>
            <p>当前阶段不会写入文件或执行 Git 操作。</p>
          </div>
        </div>

        <form class="path-form" @submit.prevent="openDocument">
          <label for="document-path">Markdown 路径</label>
          <input id="document-path" v-model="requestedPath" spellcheck="false" />
          <p>允许范围：{{ editorConfig?.allowedDocumentPattern }}</p>
          <button class="primary-button" type="submit" :disabled="loadingDocument">
            {{ loadingDocument ? '正在读取…' : '打开文档' }}
          </button>
        </form>

        <section class="status-card" aria-live="polite">
          <div class="status-heading">
            <span class="status-indicator" :data-tone="statusTone"></span>
            <strong>{{ statusLabel }}</strong>
          </div>
          <dl v-if="previewStatus?.status">
            <div>
              <dt>Release</dt>
              <dd>{{ previewStatus.status.releaseId || '—' }}</dd>
            </div>
            <div>
              <dt>Commit</dt>
              <dd>{{ previewStatus.status.sourceCommit || '—' }}</dd>
            </div>
            <div>
              <dt>原因</dt>
              <dd>{{ previewStatus.status.buildReason || '—' }}</dd>
            </div>
          </dl>
          <p v-else class="status-error">{{ previewStatus?.error || '正在读取预览状态…' }}</p>
          <button class="refresh-button" type="button" @click="refreshPreviewStatus">刷新状态</button>
        </section>
      </aside>

      <section class="document-panel">
        <div v-if="errorMessage" class="workspace-error" role="alert">{{ errorMessage }}</div>
        <div v-if="document" class="document-header">
          <div>
            <p class="eyebrow">SOURCE DOCUMENT</p>
            <h1>{{ document.path }}</h1>
            <p>{{ documentStats }} · 修改于 {{ new Date(document.modifiedAt).toLocaleString('zh-CN') }}</p>
          </div>
          <div class="hash-block">
            <span>SHA-256</span>
            <code>{{ document.hash.slice(0, 16) }}…</code>
          </div>
        </div>
        <textarea
          v-if="document"
          class="source-viewer"
          :value="document.content"
          readonly
          spellcheck="false"
          aria-label="Markdown 源文件内容"
        ></textarea>
        <div v-else class="empty-state">
          <div class="empty-glyph">MD</div>
          <h2>选择一个 Markdown 文档</h2>
          <p>通过 VitePress 页脚编辑链接进入时，这里会自动加载对应源文件。</p>
        </div>
      </section>
    </section>
  </div>
</template>
