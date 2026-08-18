<script setup lang="ts">
import { computed } from 'vue'

type Locale = 'zh' | 'en'
type RouteIcon = 'site' | 'content' | 'development'

interface RouteItem {
  icon: RouteIcon
  title: string
  description: string
  href: string
}

interface RouteContent {
  builderLabel: string
  description: string
  routes: RouteItem[]
}

const props = withDefaults(defineProps<{ locale?: Locale }>(), {
  locale: 'zh',
})

const contentByLocale: Record<Locale, RouteContent> = {
  zh: {
    builderLabel: '文档路线导航',
    description: '根据您的目标，选择一条学习路线',
    routes: [
      {
        icon: 'site',
        title: '建站与设计',
        description: '创建站点、发布页面、绑定域名',
        href: '/quick-start/',
      },
      {
        icon: 'content',
        title: '内容管理',
        description: '建立内容模型、维护内容与日常运营',
        href: '/cms/content/',
      },
      {
        icon: 'development',
        title: '开发与集成',
        description: '使用 KScript API 与外部系统集成',
        href: '/api/',
      },
    ],
  },
  en: {
    builderLabel: 'Documentation route navigation',
    description: 'Choose a learning path based on your goal',
    routes: [
      {
        icon: 'site',
        title: 'Site building and design',
        description: 'Create a site, publish pages, and bind a domain',
        href: '/en/cms/getting-started/create-site',
      },
      {
        icon: 'content',
        title: 'Content management',
        description: 'Model, maintain, and operate structured content',
        href: '/en/cms/content/',
      },
      {
        icon: 'development',
        title: 'Development and integration',
        description: 'Use KScript APIs and integrate external systems',
        href: '/en/api/',
      },
    ],
  },
}

const content = computed(() => contentByLocale[props.locale])
</script>

<template>
  <nav class="kb-doc-builder" :aria-label="content.builderLabel">
    <p class="kb-doc-builder__intro">{{ content.description }}</p>

    <div class="kb-doc-builder__routes">
      <a v-for="route in content.routes" :key="route.href" :href="route.href">
        <span
          class="kb-doc-builder__icon"
          :class="`kb-doc-builder__icon--${route.icon}`"
          aria-hidden="true"
        ></span>
        <span class="kb-doc-builder__copy">
          <strong>{{ route.title }}</strong>
          <em>{{ route.description }}</em>
        </span>
        <span class="kb-doc-builder__arrow" aria-hidden="true">
          <svg viewBox="0 0 20 20"><path d="m8 5 5 5-5 5" /></svg>
        </span>
      </a>
    </div>
  </nav>
</template>
