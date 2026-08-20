<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { html as renderDiffHtml } from 'diff2html'
import {
  ApiError,
  getWorkspaceCommits,
  getWorkspaceDiff,
  requestProductionPublish,
  retryWorkspacePush,
  revertWorkspaceFiles,
  submitWorkspace,
  type WorkspaceCommitPayload,
  type WorkspaceDiffPayload,
  type WorkspaceFilePayload,
} from '../api'
import { useWorkspace } from '../app/workspace'

const workspace = useWorkspace()
const loading = ref(false)
const loadingDiff = ref(false)
const mutating = ref(false)
const selectedPath = ref('')
const diff = shallowRef<WorkspaceDiffPayload | null>(null)
const commits = shallowRef<WorkspaceCommitPayload[]>([])
const commitMessage = ref('')
const errorMessage = ref('')
const noticeMessage = ref('')
const guideOpen = ref(window.localStorage.getItem('kb-docs-studio-guide-dismissed') !== 'true')
type DiffLayout = 'line-by-line' | 'side-by-side'
const diffLayout = ref<DiffLayout>(window.localStorage.getItem('kb-docs-studio-diff-layout') === 'side-by-side' ? 'side-by-side' : 'line-by-line')

const status = computed(() => workspace.workspaceStatus.value)
const publish = computed(() => workspace.publishStatus.value)
const publishAvailable = computed(() => Boolean(workspace.editorConfig.value?.productionPublishAvailable))
const publishRunning = computed(() => ['queued', 'preparing', 'planning', 'deploying', 'verifying'].includes(publish.value.status))
const canPublish = computed(() => Boolean(
  publishAvailable.value && status.value && !mutating.value && !publishRunning.value &&
  !status.value.changedFiles && !status.value.pendingPush && !status.value.stagedFiles && !status.value.outOfScopeFiles
))
const publishButtonLabel = computed(() => {
  const labels: Record<string, string> = {
    queued: '发布已排队…', preparing: '正在准备资源…', planning: '正在检查计划…',
    deploying: '正在发布…', verifying: '正在验收…', succeeded: '重新发布', failed: '重试发布',
  }
  if (publish.value.status === 'approval_required') return `确认 ${publish.value.summary?.delete || 0} 个删除并发布`
  return labels[publish.value.status] || '发布到 Kooboo'
})
const publishStatusTitle = computed(() => {
  const labels: Record<string, string> = {
    idle: '等待发布', queued: '发布任务已排队', preparing: '正在生成 Kooboo 资源', planning: '正在核对发布计划',
    approval_required: '需要确认删除项', deploying: '正在上传远程站点', verifying: '正在执行线上验收',
    succeeded: '远程站点已发布', failed: '发布失败',
  }
  return labels[publish.value.status] || '发布状态'
})
const selectedFile = computed(() => status.value?.files.find((file) => file.path === selectedPath.value) || null)
const canMutate = computed(() => Boolean(
  status.value && !mutating.value && status.value.stagedFiles === 0 && status.value.outOfScopeFiles === 0
))
const canSubmit = computed(() => Boolean(
  canMutate.value && status.value?.changedFiles && commitMessage.value.trim().length >= 5
))
const currentStep = computed(() => {
  if (status.value?.pendingPush) return 3
  if (status.value?.changedFiles) return 2
  return 1
})
const statusText = computed(() => {
  if (!status.value) return '正在读取服务器 Git 工作区'
  if (status.value.pendingPush) return '版本已提交到服务器，但尚未推送审核分支'
  if (status.value.changedFiles) return `检测到 ${status.value.changedFiles} 个文档文件改动`
  return '当前没有待提交的文档改动'
})
const renderedDiff = computed(() => diff.value?.diff ? renderDiffHtml(diff.value.diff, {
  drawFileList: false,
  outputFormat: diffLayout.value,
  matching: 'lines',
  diffStyle: 'word',
  colorScheme: 'light',
}) : '')

const statusLabels: Record<WorkspaceFilePayload['status'], string> = {
  modified: '修改', added: '新增', deleted: '删除', renamed: '重命名', copied: '复制', untracked: '新增',
}

function setError(error: unknown) {
  errorMessage.value = error instanceof Error ? error.message : String(error)
}

function clearMessages() {
  errorMessage.value = ''
  noticeMessage.value = ''
}

async function loadWorkspace() {
  loading.value = true
  clearMessages()
  try {
    await workspace.refreshWorkspaceStatus()
    const recent = await getWorkspaceCommits(6)
    commits.value = recent.commits
    const files = status.value?.files || []
    if (!files.some((file) => file.path === selectedPath.value)) selectedPath.value = files[0]?.path || ''
    if (selectedPath.value) await loadDiff(selectedPath.value)
    else diff.value = null
  } catch (error) {
    setError(error)
  } finally {
    loading.value = false
  }
}

async function loadDiff(filePath: string) {
  selectedPath.value = filePath
  loadingDiff.value = true
  errorMessage.value = ''
  try {
    diff.value = await getWorkspaceDiff(filePath)
  } catch (error) {
    setError(error)
    diff.value = null
  } finally {
    loadingDiff.value = false
  }
}

async function revertFiles(paths: string[]) {
  if (!status.value || !canMutate.value) return
  const target = paths.length === 1 ? paths[0] : `全部 ${status.value.changedFiles} 个文件`
  if (!window.confirm(`确定撤销 ${target} 的改动吗？此操作会恢复服务器 Git 中的版本，且无法在平台内找回。`)) return
  mutating.value = true
  clearMessages()
  try {
    workspace.workspaceStatus.value = await revertWorkspaceFiles(paths, status.value.fingerprint)
    await loadWorkspace()
    noticeMessage.value = paths.length === 1 ? '文件改动已撤销。' : '全部文档改动已撤销，Git 自动同步可以恢复。'
  } catch (error) {
    if (error instanceof ApiError && error.code === 'WORKSPACE_CHANGED') await workspace.refreshWorkspaceStatus()
    setError(error)
  } finally {
    mutating.value = false
  }
}

async function submitChanges() {
  if (!status.value || !canSubmit.value) return
  if (!window.confirm(`将 ${status.value.changedFiles} 个文档文件提交并推送到 ${status.value.remote}/${status.value.remoteBranch}。确定继续吗？`)) return
  mutating.value = true
  clearMessages()
  try {
    const result = await submitWorkspace(commitMessage.value.trim(), status.value.fingerprint)
    workspace.workspaceStatus.value = result.workspace
    commitMessage.value = ''
    await loadWorkspace()
    noticeMessage.value = `版本 ${result.commit.slice(0, 8)} 已提交并推送，Git 自动同步可以恢复。`
  } catch (error) {
    await workspace.refreshWorkspaceStatus()
    setError(error)
  } finally {
    mutating.value = false
  }
}

async function retryPush() {
  mutating.value = true
  clearMessages()
  try {
    const result = await retryWorkspacePush()
    workspace.workspaceStatus.value = result.workspace
    await loadWorkspace()
    noticeMessage.value = `版本 ${result.commit.slice(0, 8)} 已成功推送。`
  } catch (error) {
    await workspace.refreshWorkspaceStatus()
    setError(error)
  } finally {
    mutating.value = false
  }
}

async function publishToKooboo() {
  if (!status.value || !canPublish.value) return
  const applyDeletes = publish.value.status === 'approval_required'
  const deleteText = applyDeletes
    ? `\n\n本次会删除 ${publish.value.summary?.delete || 0} 个远程资源。`
    : ''
  const target = workspace.editorConfig.value?.productionPublishTarget || 'Kooboo 站点'
  if (!window.confirm(`将版本 ${status.value.head.slice(0, 8)} 发布到 ${target}。系统会自动构建、上传并验收。${deleteText}\n\n确定继续吗？`)) return
  mutating.value = true
  clearMessages()
  try {
    workspace.publishStatus.value = await requestProductionPublish(status.value.head, applyDeletes)
    noticeMessage.value = '发布任务已经开始，可以停留在本页查看进度。'
  } catch (error) {
    setError(error)
  } finally {
    mutating.value = false
  }
}

function dismissGuide() {
  guideOpen.value = false
  window.localStorage.setItem('kb-docs-studio-guide-dismissed', 'true')
}

function setDiffLayout(layout: DiffLayout) {
  diffLayout.value = layout
  window.localStorage.setItem('kb-docs-studio-diff-layout', layout)
}

onMounted(async () => {
  await Promise.all([loadWorkspace(), workspace.refreshPublishStatus()])
})
</script>

<template>
  <div class="workflow-page page-content">
    <section v-if="guideOpen" class="platform-guide" aria-labelledby="platform-guide-title">
      <div>
        <p class="section-kicker">第一次使用</p>
        <h2 id="platform-guide-title">维护文档只需要记住三件事</h2>
        <ol>
          <li><span>1</span><p><strong>保存草稿</strong>在编辑器按 ⌘/Ctrl + S，4173 会立即更新。</p></li>
          <li><span>2</span><p><strong>核对改动</strong>在本页逐个查看差异，需要时撤销错误修改。</p></li>
          <li><span>3</span><p><strong>提交并发布</strong>先提交版本，再点击“发布到 Kooboo”；系统会自动构建和验收。</p></li>
        </ol>
      </div>
      <button type="button" @click="dismissGuide">我知道了</button>
    </section>

    <section class="workflow-progress" aria-label="文档维护流程">
      <article v-for="(item, index) in ['编辑并保存', '检查改动', '提交审核', '构建与发布']" :key="item" :class="{ done: currentStep > index + 1, current: currentStep === index + 1 }">
        <span>{{ currentStep > index + 1 ? '✓' : index + 1 }}</span><strong>{{ item }}</strong>
      </article>
    </section>

    <div v-if="errorMessage" class="workspace-error" role="alert"><span>{{ errorMessage }}</span><button type="button" @click="loadWorkspace">刷新状态</button></div>
    <div v-if="noticeMessage" class="workspace-notice" role="status">{{ noticeMessage }}</div>

    <section class="workflow-summary">
      <div>
        <p class="section-kicker">服务器工作区</p>
        <h2>{{ statusText }}</h2>
        <p v-if="status">基线 {{ status.head.slice(0, 8) }} · {{ status.branch }} → {{ status.remote }}/{{ status.remoteBranch }}</p>
      </div>
      <div class="workflow-summary-actions">
        <button class="ghost-button" type="button" :disabled="loading || mutating" @click="loadWorkspace">{{ loading ? '刷新中…' : '刷新' }}</button>
        <RouterLink class="primary-link compact" to="/content/editor">继续编辑</RouterLink>
      </div>
    </section>

    <section v-if="status?.stagedFiles || status?.outOfScopeFiles" class="workflow-blocker">
      <strong>平台已停止写操作</strong>
      <p v-if="status.stagedFiles">存在 {{ status.stagedFiles }} 个由平台之外产生的 Git 暂存文件。</p>
      <p v-if="status.outOfScopeFiles">存在 {{ status.outOfScopeFiles }} 个 docs 目录之外的仓库改动。</p>
      <span>这是保护机制，需要管理员在服务器上处理，内容维护人员不应尝试绕过。</span>
    </section>

    <section v-if="status?.pendingPush" class="pending-push-panel">
      <div><p class="section-kicker">需要重试</p><h2>提交 {{ status.pendingPushCommit?.slice(0, 8) }} 尚未推送</h2><p>本地版本不会丢失，自动同步仍保持暂停。网络恢复后点击重试即可。</p></div>
      <button class="primary-action" type="button" :disabled="mutating" @click="retryPush">{{ mutating ? '正在推送…' : '重试推送' }}</button>
    </section>

    <div class="workflow-layout">
      <section class="changes-panel">
        <header class="section-heading"><div><p class="section-kicker">当前改动</p><h2>{{ status?.changedFiles || 0 }} 个文件</h2></div><button v-if="status?.changedFiles" class="danger-link" type="button" :disabled="!canMutate" @click="revertFiles([])">撤销全部</button></header>
        <div v-if="!status?.changedFiles" class="workflow-empty"><div>✓</div><h3>没有待提交改动</h3><p>从 4173 打开文档编辑器，保存草稿后会出现在这里。</p></div>
        <div v-else class="change-list">
          <button v-for="file in status.files" :key="file.path" type="button" :class="{ active: selectedPath === file.path }" @click="loadDiff(file.path)">
            <span :data-status="file.status">{{ statusLabels[file.status] }}</span>
            <div><strong>{{ file.path }}</strong><small v-if="file.originalPath">来自 {{ file.originalPath }}</small></div>
            <b v-if="!file.binary"><i>+{{ file.additions ?? 0 }}</i><em>-{{ file.deletions ?? 0 }}</em></b><b v-else>图片</b>
          </button>
        </div>
      </section>

      <section class="diff-panel">
        <header class="section-heading">
          <div><p class="section-kicker">差异预览</p><h2>{{ selectedFile?.path || '选择一个文件' }}</h2></div>
          <div class="diff-heading-actions">
            <div v-if="selectedFile && !selectedFile.binary" class="diff-layout-switch" aria-label="差异显示方式">
              <button type="button" :class="{ active: diffLayout === 'line-by-line' }" @click="setDiffLayout('line-by-line')">统一</button>
              <button type="button" :class="{ active: diffLayout === 'side-by-side' }" @click="setDiffLayout('side-by-side')">左右对照</button>
            </div>
            <button v-if="selectedFile" class="danger-link" type="button" :disabled="!canMutate" @click="revertFiles([selectedFile.path])">撤销此文件</button>
          </div>
        </header>
        <div v-if="loadingDiff" class="diff-loading">正在读取差异…</div>
        <div v-else-if="diff?.binary" class="binary-diff"><strong>二进制文件已变化</strong><p>图片对比将在图片资源阶段接入；当前仍可提交或撤销该文件。</p></div>
        <div v-else-if="renderedDiff" class="diff-view" v-html="renderedDiff"></div>
        <div v-else class="diff-placeholder">从左侧选择文件查看具体改动。</div>
        <p v-if="diff?.truncated" class="diff-truncated">差异内容较大，平台仅展示前 768 KB；提交仍会包含完整文件。</p>
      </section>
    </div>

    <section class="submit-panel">
      <div>
        <p class="section-kicker">提交版本</p>
        <h2>用一句话说明这次改了什么</h2>
        <p>提交后会生成 Git commit 并推送到当前审核分支；工作区干净后即可在下方直接发布。</p>
      </div>
      <form @submit.prevent="submitChanges">
        <label for="commit-message">修改说明</label>
        <input id="commit-message" v-model="commitMessage" maxlength="120" placeholder="例如：docs: 更新 CMS 用户权限说明" />
        <div><span>{{ commitMessage.trim().length }} / 120</span><button class="primary-action" type="submit" :disabled="!canSubmit">{{ mutating ? '正在提交…' : '提交并推送' }}</button></div>
      </form>
    </section>

    <section class="production-publish" :data-status="publish.status">
      <div class="production-publish-copy">
        <p class="section-kicker">远程发布</p>
        <h2>{{ publishAvailable ? publishStatusTitle : 'Kooboo 发布尚未配置' }}</h2>
        <p v-if="publishAvailable">{{ publish.message }}</p>
        <p v-else>管理员完成目标站点、凭据和部署基线配置后，这里会出现可用的发布按钮。</p>
        <div v-if="publishAvailable" class="publish-meta">
          <span>目标 {{ workspace.editorConfig.value?.productionPublishTarget }}</span>
          <span v-if="publish.sourceCommit">版本 {{ publish.sourceCommit.slice(0, 8) }}</span>
          <span v-if="publish.summary">上传 {{ publish.summary.upsert }} · 删除 {{ publish.summary.delete }}</span>
        </div>
      </div>
      <div class="production-publish-action">
        <button class="publish-button" type="button" :disabled="!canPublish" @click="publishToKooboo">{{ publishButtonLabel }}</button>
        <small v-if="status?.changedFiles || status?.pendingPush">请先完成上方“提交并推送”</small>
        <small v-else-if="publishRunning">发布期间请勿提交新的文档改动</small>
        <small v-else-if="publish.status === 'succeeded' && publish.finishedAt">完成于 {{ new Date(publish.finishedAt).toLocaleString('zh-CN') }}</small>
        <small v-else>点击后自动构建、部署并验证线上页面</small>
      </div>
    </section>

    <section class="recent-commits">
      <header class="section-heading"><div><p class="section-kicker">最近版本</p><h2>文档提交记录</h2></div></header>
      <div><article v-for="item in commits" :key="item.hash"><code>{{ item.shortHash }}</code><p><strong>{{ item.subject }}</strong><span>{{ item.author }} · {{ new Date(item.authoredAt).toLocaleString('zh-CN') }}</span></p></article></div>
    </section>
  </div>
</template>
