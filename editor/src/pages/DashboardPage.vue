<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspace } from '../app/workspace'

const workspace = useWorkspace()

const draftText = computed(() => workspace.hasDraft.value
  ? '服务器存在尚未提交的草稿，Git 自动同步已暂停。'
  : '服务器工作区没有活动草稿，Git 自动同步可以正常运行。')

const buildText = computed(() => {
  if (workspace.buildStatus.value.status === 'ready') return '最近一次稳定构建已经成功切换。'
  if (['queued', 'building'].includes(workspace.buildStatus.value.status)) return '稳定构建正在后台执行。'
  if (workspace.buildStatus.value.status === 'error') return '草稿仍然保留，但最近一次稳定构建失败。'
  return '保存草稿不会自动构建 4175。'
})
</script>

<template>
  <div class="dashboard-page page-content">
    <section class="continue-work">
      <div>
        <p class="section-kicker">继续工作</p>
        <h2>{{ workspace.buildStatus.value.path || '从文档站进入编辑器' }}</h2>
        <p>{{ draftText }}</p>
      </div>
      <RouterLink class="primary-link" :to="{ name: 'editor', query: workspace.buildStatus.value.path ? { path: workspace.buildStatus.value.path } : undefined }">打开文档编辑器</RouterLink>
    </section>

    <section class="system-overview" aria-labelledby="system-overview-title">
      <div class="section-heading"><div><p class="section-kicker">系统状态</p><h2 id="system-overview-title">编辑、预览与版本边界</h2></div><span>自动刷新</span></div>
      <div class="status-ledger">
        <article>
          <div class="ledger-icon fast">17</div>
          <div><strong>4173 快速预览</strong><span>保存草稿后通过 HMR 更新</span></div>
          <b :data-tone="workspace.previewStatus.value?.fast.available ? 'success' : 'danger'">{{ workspace.previewStatus.value?.fast.available ? '在线' : '不可用' }}</b>
        </article>
        <article>
          <div class="ledger-icon stable">15</div>
          <div><strong>4175 稳定预览</strong><span>{{ buildText }}</span></div>
          <b :data-tone="workspace.previewStatus.value?.stable.available ? 'success' : 'danger'">{{ workspace.stableReleaseId.value || '尚无 Release' }}</b>
        </article>
        <article>
          <div class="ledger-icon git">Git</div>
          <div><strong>Git 内容基线</strong><span>{{ workspace.hasDraft.value ? '等待提交或撤销草稿' : '工作区可同步远端提交' }}</span></div>
          <b :data-tone="workspace.hasDraft.value ? 'warning' : 'success'">{{ workspace.hasDraft.value ? '同步暂停' : '可同步' }}</b>
        </article>
      </div>
    </section>

    <section class="dashboard-columns">
      <article class="workflow-panel">
        <div class="section-heading"><div><p class="section-kicker">当前工作流</p><h2>从草稿到发布</h2></div></div>
        <ol class="workflow-timeline">
          <li class="done"><span>1</span><div><strong>保存草稿</strong><p>原子写入 Markdown，并立即更新 4173。</p></div></li>
          <li :class="{ current: workspace.hasDraft.value }"><span>2</span><div><strong>构建稳定预览</strong><p>显式运行完整构建，成功后更新 4175。</p></div></li>
          <li><span>3</span><div><strong>提交与审核</strong><p>Phase B 接入 Git diff、commit 和审核分支。</p></div></li>
          <li><span>4</span><div><strong>候选与生产</strong><p>Phase D/E 接入 artifact、Kooboo 候选验收和线上发布。</p></div></li>
        </ol>
      </article>
      <article class="next-panel">
        <p class="section-kicker">下一步建设</p>
        <h2>当前改动与 Git 闭环</h2>
        <p>后台骨架完成后，优先让服务器草稿可以被审查、提交或安全撤销，避免 Git 自动同步长期暂停。</p>
        <RouterLink to="/changes/workspace">查看当前改动规划</RouterLink>
      </article>
    </section>
  </div>
</template>
