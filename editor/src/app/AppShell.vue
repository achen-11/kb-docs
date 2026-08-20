<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { navigationGroups } from './navigation'
import { useWorkspace } from './workspace'

const route = useRoute()
const router = useRouter()
const workspace = useWorkspace()
const stored = window.localStorage.getItem('kb-docs-studio-navigation')
const navigationCollapsed = ref(stored === 'collapsed' || (stored === null && Boolean(route.meta.immersive)))
const mobileNavigationOpen = ref(false)

const shellClasses = computed(() => ({
  'navigation-is-collapsed': navigationCollapsed.value,
  'navigation-is-open': mobileNavigationOpen.value,
  'page-is-immersive': Boolean(route.meta.immersive),
}))

const buildLabel = computed(() => {
  const labels = {
    idle: '稳定预览未构建', draft_saved: '草稿待构建', queued: '构建已排队', saving: '正在保存', building: '正在构建',
    ready: '稳定预览可用', error: '稳定构建失败', conflict: '内容冲突',
  }
  return labels[workspace.buildStatus.value.status]
})

const publishLabel = computed(() => {
  const labels: Record<string, string> = {
    queued: '发布已排队', preparing: '准备发布', planning: '检查计划', deploying: '正在发布',
    verifying: '线上验收', approval_required: '待确认删除', succeeded: '已发布', failed: '发布失败',
  }
  return labels[workspace.publishStatus.value.status] || ''
})

function toggleNavigation() {
  navigationCollapsed.value = !navigationCollapsed.value
  window.localStorage.setItem('kb-docs-studio-navigation', navigationCollapsed.value ? 'collapsed' : 'expanded')
}

async function signOut() {
  await workspace.signOut()
  await router.replace('/')
}

watch(() => route.fullPath, () => {
  mobileNavigationOpen.value = false
})
</script>

<template>
  <div class="studio-shell" :class="shellClasses">
    <header class="studio-topbar">
      <div class="studio-brand">
        <button class="mobile-menu-button" type="button" aria-label="打开导航" @click="mobileNavigationOpen = true">☰</button>
        <div class="brand-mark brand-mark-small">K</div>
        <div class="brand-copy"><strong>Kooboo Docs Studio</strong><span>内网文档运营后台</span></div>
      </div>
      <div class="global-search" aria-label="全局搜索规划中">
        <span>⌕</span><span>搜索文档、图片或版本</span><kbd>⌘ K</kbd>
      </div>
      <div class="global-statuses">
        <a v-if="workspace.editorConfig.value?.fastPreviewBaseUrl" :href="workspace.editorConfig.value.fastPreviewBaseUrl" target="_blank" rel="noreferrer" class="global-status">
          <i :data-tone="workspace.previewStatus.value?.fast.available ? 'success' : 'danger'"></i>
          <span>4173</span>
        </a>
        <a v-if="workspace.editorConfig.value?.stablePreviewBaseUrl" :href="workspace.editorConfig.value.stablePreviewBaseUrl" target="_blank" rel="noreferrer" class="global-status">
          <i :data-tone="workspace.previewStatus.value?.stable.available ? 'success' : 'danger'"></i>
          <span>{{ buildLabel }}</span>
        </a>
        <span v-if="workspace.hasDraft.value" class="global-status draft-status"><i data-tone="warning"></i><span>Git 同步暂停</span></span>
        <RouterLink v-if="publishLabel" to="/workflow" class="global-status">
          <i :data-tone="workspace.publishStatus.value.status === 'succeeded' ? 'success' : workspace.publishStatus.value.status === 'failed' || workspace.publishStatus.value.status === 'approval_required' ? 'warning' : 'working'"></i>
          <span>{{ publishLabel }}</span>
        </RouterLink>
        <button class="user-menu" type="button" @click="signOut"><span>内部用户</span><small>退出</small></button>
      </div>
    </header>

    <aside class="studio-navigation">
      <div class="navigation-head">
        <button class="navigation-toggle" type="button" :aria-label="navigationCollapsed ? '展开导航' : '收起导航'" @click="toggleNavigation">
          <span>{{ navigationCollapsed ? '›' : '‹' }}</span><strong>导航</strong>
        </button>
        <button class="navigation-close" type="button" aria-label="关闭导航" @click="mobileNavigationOpen = false">×</button>
      </div>
      <nav aria-label="Docs Studio 主导航">
        <section v-for="group in navigationGroups" :key="group.label" class="navigation-group">
          <p>{{ group.label }}</p>
          <RouterLink v-for="item in group.items" :key="item.route" :to="item.route" :title="navigationCollapsed ? item.label : undefined">
            <AppIcon :name="item.icon" />
            <span>{{ item.label }}</span>
            <small v-if="item.phase">{{ item.phase }}</small>
          </RouterLink>
        </section>
      </nav>
    </aside>
    <button class="navigation-backdrop" type="button" aria-label="关闭导航" @click="mobileNavigationOpen = false"></button>

    <main id="studio-main" class="studio-main">
      <header v-if="!route.meta.immersive" class="page-header">
        <div><p>{{ route.meta.eyebrow }}</p><h1>{{ route.meta.title }}</h1><span>{{ route.meta.description }}</span></div>
      </header>
      <RouterView />
    </main>
  </div>
</template>
