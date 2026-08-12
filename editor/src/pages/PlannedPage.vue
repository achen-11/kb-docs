<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspace } from '../app/workspace'

const props = defineProps<{ phase: string; capability: string }>()
const route = useRoute()
const workspace = useWorkspace()

const details = computed(() => ({
  media: ['文件夹、搜索和缩略图浏览', '上传、拖拽和剪贴板粘贴', '编辑器内插入 DocImage', '引用检查与安全删除'],
  changes: ['展示 Markdown 与图片变化', '单文件或全部撤销', '填写修改说明', '提交并推送审核分支'],
  commits: ['Commit、作者与文件统计', '关联构建和发布状态', '查看完整版本 diff'],
  reviews: ['审核 diff 与 4175 预览', '记录审核意见', '通过后合并 main'],
  builds: ['构建历史与 release', '构建来源与日志', '失败保留上一成功版本'],
  candidate: ['生成 artifact commit', '审查 kb deploy 计划', '部署内网 Kooboo 候选站', 'HTTP 与浏览器验收'],
  production: ['只接受候选验收通过版本', '发布者重新认证', '显式确认删除项', '成功后推进生产 baseline'],
  history: ['source 与 artifact commit', '部署回执与验收结果', '环境基线与回滚关系'],
  users: ['独立用户身份', '编辑、审核和发布角色', '高风险操作重新认证'],
  settings: ['预览地址与跟踪分支', '候选和生产环境目标', '凭据只保存在服务端'],
  audit: ['操作者、时间与文件', '保存、构建、提交和发布结果', '可审计的失败记录'],
})[props.capability] || [])
</script>

<template>
  <div class="planned-page page-content">
    <section class="planned-hero">
      <div><span>{{ phase }}</span><p>架构已确认 · 能力尚未接入</p></div>
      <h2>{{ route.meta.title }}</h2>
      <p>{{ route.meta.description }}</p>
    </section>
    <section class="planned-layout">
      <article>
        <p class="section-kicker">计划能力</p>
        <ul><li v-for="item in details" :key="item"><span>✓</span>{{ item }}</li></ul>
      </article>
      <aside>
        <p class="section-kicker">当前系统边界</p>
        <dl>
          <div><dt>4173</dt><dd>{{ workspace.previewStatus.value?.fast.available ? '快速预览在线' : '当前不可用' }}</dd></div>
          <div><dt>4175</dt><dd>{{ workspace.stableReleaseId.value || '尚无稳定 Release' }}</dd></div>
          <div><dt>Git</dt><dd>{{ workspace.hasDraft.value ? '草稿导致同步暂停' : '工作区可同步' }}</dd></div>
        </dl>
        <p>本页面只说明已经确认的目标与依赖，不提供尚未实现的写操作。</p>
      </aside>
    </section>
  </div>
</template>
