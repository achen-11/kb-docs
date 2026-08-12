<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import {
  getMediaList,
  getMediaReferences,
  mediaContentUrl,
  uploadMedia,
  type MediaItemPayload,
  type MediaListPayload,
  type MediaReferencesPayload,
} from '../api'
import { useWorkspace } from '../app/workspace'

const props = defineProps<{ compact?: boolean; selectLabel?: string }>()
const emit = defineEmits<{ select: [item: MediaItemPayload] }>()
const workspace = useWorkspace()
const loading = ref(false)
const uploading = ref(false)
const dragging = ref(false)
const search = ref('')
const root = ref('')
const page = ref(1)
const payload = shallowRef<MediaListPayload | null>(null)
const selected = shallowRef<MediaItemPayload | null>(null)
const references = shallowRef<MediaReferencesPayload | null>(null)
const uploadDirectory = ref('cms')
const errorMessage = ref('')
const noticeMessage = ref('')
const fileInput = shallowRef<HTMLInputElement | null>(null)
let searchTimer: number | undefined

const totalPages = computed(() => Math.max(1, Math.ceil((payload.value?.total || 0) / (payload.value?.pageSize || 48))))
const canUpload = computed(() => !uploading.value && !workspace.workspaceStatus.value?.pendingPush)
const docImageReference = computed(() => selected.value ? `<DocImage src="${selected.value.url}" alt="${selected.value.name.replace(/\.[^.]+$/u, '')}" />` : '')

function setError(error: unknown) { errorMessage.value = error instanceof Error ? error.message : String(error) }
function clearMessages() { errorMessage.value = ''; noticeMessage.value = '' }
function readableBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

async function loadMedia(resetSelection = false) {
  loading.value = true
  errorMessage.value = ''
  try {
    payload.value = await getMediaList({ root: root.value, search: search.value.trim(), page: page.value, pageSize: props.compact ? 24 : 48 })
    if (resetSelection || !payload.value.items.some((item) => item.path === selected.value?.path)) {
      await selectItem(payload.value.items[0] || null)
    }
  } catch (error) {
    setError(error)
  } finally {
    loading.value = false
  }
}

async function selectItem(item: MediaItemPayload | null) {
  selected.value = item
  references.value = null
  if (!item) return
  try { references.value = await getMediaReferences(item.path) } catch (error) { setError(error) }
}

function fileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('无法读取图片文件。'))
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '')
    reader.readAsDataURL(file)
  })
}

async function uploadFiles(files: FileList | File[]) {
  if (!canUpload.value || !files.length) return
  uploading.value = true
  clearMessages()
  try {
    let latest: MediaItemPayload | null = null
    for (const file of Array.from(files)) {
      latest = await uploadMedia(uploadDirectory.value, file.name, await fileAsBase64(file))
    }
    await workspace.refreshWorkspaceStatus()
    root.value = uploadDirectory.value.split('/').slice(0, uploadDirectory.value.startsWith('en/') ? 2 : 1).join('/')
    search.value = ''
    page.value = 1
    await loadMedia()
    if (latest) await selectItem(payload.value?.items.find((item) => item.path === latest?.path) || latest)
    noticeMessage.value = `${files.length} 张图片已保存为 Git 草稿，4173 可立即引用。`
  } catch (error) {
    setError(error)
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function copyText(value: string, label: string) {
  try { await navigator.clipboard.writeText(value); noticeMessage.value = `${label}已复制。` } catch { errorMessage.value = '浏览器未允许写入剪贴板。' }
}
function handleDrop(event: DragEvent) { dragging.value = false; if (event.dataTransfer?.files.length) void uploadFiles(event.dataTransfer.files) }
function handlePaste(event: ClipboardEvent) {
  if (!canUpload.value) return
  const files = Array.from(event.clipboardData?.files || []).filter((file) => file.type.startsWith('image/'))
  if (files.length) { event.preventDefault(); void uploadFiles(files) }
}

watch(root, () => { page.value = 1; uploadDirectory.value = root.value || 'cms'; void loadMedia(true) })
watch(search, () => { window.clearTimeout(searchTimer); searchTimer = window.setTimeout(() => { page.value = 1; void loadMedia(true) }, 280) })
watch(page, () => void loadMedia(true))
onMounted(() => { window.addEventListener('paste', handlePaste); void loadMedia(true) })
onUnmounted(() => { window.removeEventListener('paste', handlePaste); window.clearTimeout(searchTimer) })
</script>

<template>
  <div class="media-browser" :class="{ compact }" @dragenter.prevent="dragging = true" @dragover.prevent @dragleave.self="dragging = false" @drop.prevent="handleDrop">
    <div v-if="dragging" class="media-drop-overlay"><strong>释放以上传图片</strong><span>将保存到 {{ uploadDirectory }}</span></div>
    <header class="media-toolbar">
      <div class="media-search"><span aria-hidden="true">⌕</span><input v-model="search" placeholder="搜索文件名或路径" aria-label="搜索图片" /></div>
      <label>目录<select v-model="root"><option value="">全部资源</option><option value="cms">CMS</option><option value="product">Product</option><option value="en/cms">English / CMS</option><option value="en/product">English / Product</option></select></label>
      <label>上传到<select v-model="uploadDirectory"><option v-for="folder in payload?.folders || []" :key="folder" :value="folder">{{ folder }}</option><option v-if="!(payload?.folders || []).includes(uploadDirectory)" :value="uploadDirectory">{{ uploadDirectory }}</option></select></label>
      <button class="primary-action" type="button" :disabled="!canUpload" @click="fileInput?.click()">{{ uploading ? '上传中…' : '上传图片' }}</button>
      <input ref="fileInput" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple @change="$event.target instanceof HTMLInputElement && $event.target.files && uploadFiles($event.target.files)" />
    </header>
    <div v-if="workspace.workspaceStatus.value?.pendingPush" class="media-warning">已有版本等待推送，图片上传暂时停止。</div>
    <div v-if="errorMessage" class="workspace-error" role="alert"><span>{{ errorMessage }}</span><button type="button" @click="loadMedia">重试</button></div>
    <div v-if="noticeMessage" class="workspace-notice" role="status">{{ noticeMessage }}</div>

    <div class="media-layout">
      <section class="media-grid-panel">
        <div v-if="loading" class="media-empty">正在读取图片资源…</div>
        <div v-else-if="!payload?.items.length" class="media-empty"><strong>没有匹配的图片</strong><span>调整搜索条件，或直接拖入、粘贴一张图片。</span></div>
        <div v-else class="media-grid">
          <button v-for="item in payload.items" :key="item.path" type="button" :class="{ active: selected?.path === item.path }" @click="selectItem(item)">
            <span><img :src="mediaContentUrl(item.path)" :alt="item.name" loading="lazy" /></span>
            <strong>{{ item.name }}</strong><small>{{ item.path.slice('docs/public/'.length) }}</small>
          </button>
        </div>
        <footer v-if="payload?.total" class="media-pagination"><span>共 {{ payload.total }} 张</span><div><button type="button" :disabled="page <= 1" @click="page--">上一页</button><b>{{ page }} / {{ totalPages }}</b><button type="button" :disabled="page >= totalPages" @click="page++">下一页</button></div></footer>
      </section>

      <aside class="media-detail">
        <template v-if="selected">
          <div class="media-preview"><img :src="mediaContentUrl(selected.path)" :alt="selected.name" /></div>
          <h3>{{ selected.name }}</h3>
          <dl><div><dt>URL</dt><dd>{{ selected.url }}</dd></div><div><dt>路径</dt><dd>{{ selected.path }}</dd></div><div><dt>大小</dt><dd>{{ readableBytes(selected.bytes) }}</dd></div><div><dt>修改</dt><dd>{{ new Date(selected.modifiedAt).toLocaleString('zh-CN') }}</dd></div></dl>
          <div class="media-detail-actions">
            <button type="button" @click="copyText(selected.url, '图片 URL')">复制 URL</button>
            <button type="button" @click="copyText(docImageReference, 'DocImage 引用')">复制引用</button>
            <button v-if="selectLabel" class="primary-action" type="button" @click="emit('select', selected)">{{ selectLabel }}</button>
          </div>
          <section class="media-references"><strong>引用文档 · {{ references?.references.length ?? '…' }}</strong><p v-if="references && !references.references.length">当前没有 Markdown 文档引用这张图片。</p><RouterLink v-for="reference in references?.references || []" :key="`${reference.path}:${reference.line}`" :to="{ name: 'editor', query: { path: reference.path } }">{{ reference.path }} · 第 {{ reference.line }} 行</RouterLink></section>
        </template>
        <div v-else class="media-empty">选择一张图片查看详情。</div>
      </aside>
    </div>
  </div>
</template>
