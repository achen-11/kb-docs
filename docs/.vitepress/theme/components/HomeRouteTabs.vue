<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

type Locale = 'zh' | 'en'

interface RouteItem {
  number: string
  title: string
  description: string
  href: string
}

interface RouteTab {
  id: string
  label: string
  description: string
  href: string
  routes: RouteItem[]
}

interface RouteContent {
  builderLabel: string
  tabsLabel: string
  ecosystem: string
  cta: string
  tabs: RouteTab[]
}

const props = withDefaults(defineProps<{ locale?: Locale }>(), {
  locale: 'zh',
})

const contentByLocale: Record<Locale, RouteContent> = {
  zh: {
    builderLabel: '文档路线导航',
    tabsLabel: '按文档类型筛选路线',
    ecosystem: 'Kooboo Web Ecosystem',
    cta: '进入路线',
    tabs: [
      {
        id: 'overview',
        label: '路线总览',
        description: '按目标选择入口，再进入对应文档',
        href: '/quick-start/',
        routes: [
          {
            number: '01',
            title: '建站入门',
            description: '创建站点、发布页面、绑定域名',
            href: '/quick-start/',
          },
          {
            number: '02',
            title: '内容运营',
            description: '建立内容模型、维护内容与日常运营',
            href: '/cms/content/',
          },
          {
            number: '03',
            title: '开发集成',
            description: '使用 KScript API、服务端脚本与业务集成',
            href: '/api/',
          },
        ],
      },
      {
        id: 'cms',
        label: '后台 CMS',
        description: '按后台任务定位配置与运营文档',
        href: '/cms/',
        routes: [
          {
            number: '01',
            title: '站点配置',
            description: '页面、媒体、菜单、用户与站点设置',
            href: '/cms/',
          },
          {
            number: '02',
            title: '内容运营',
            description: '数据类型、内容文件夹与内容条目',
            href: '/cms/content/',
          },
          {
            number: '03',
            title: '电商运营',
            description: '商品、订单、优惠、物流与支付配置',
            href: '/cms/commerce/',
          },
        ],
      },
      {
        id: 'api',
        label: 'KScript API',
        description: '从入门、模块索引和集成能力进入',
        href: '/api/',
        routes: [
          {
            number: '01',
            title: '快速上手',
            description: '理解 k 对象并创建第一个服务端 API',
            href: '/api/getting-started/',
          },
          {
            number: '02',
            title: '模块索引',
            description: '按 k.* 模块查找签名、参数与示例',
            href: '/api/',
          },
          {
            number: '03',
            title: '外部集成',
            description: '调用外部 OpenAPI 定义并管理授权',
            href: '/api/openapi/',
          },
        ],
      },
    ],
  },
  en: {
    builderLabel: 'Documentation route navigation',
    tabsLabel: 'Filter routes by documentation area',
    ecosystem: 'Kooboo Web Ecosystem',
    cta: 'Open route',
    tabs: [
      {
        id: 'overview',
        label: 'Route overview',
        description: 'Choose an entry by goal, then open the relevant docs',
        href: '/en/cms/getting-started/create-site',
        routes: [
          {
            number: '01',
            title: 'Site building',
            description: 'Create a site, publish pages, and bind a domain',
            href: '/en/cms/getting-started/create-site',
          },
          {
            number: '02',
            title: 'Content operations',
            description: 'Model, maintain, and operate structured content',
            href: '/en/cms/content/',
          },
          {
            number: '03',
            title: 'Development and integration',
            description: 'Use KScript APIs, server scripts, and integrations',
            href: '/en/api/',
          },
        ],
      },
      {
        id: 'cms',
        label: 'Admin CMS',
        description: 'Find setup and operations docs by admin task',
        href: '/en/cms/',
        routes: [
          {
            number: '01',
            title: 'Site setup',
            description: 'Pages, media, menus, users, and site settings',
            href: '/en/cms/',
          },
          {
            number: '02',
            title: 'Content operations',
            description: 'Content types, folders, and content items',
            href: '/en/cms/content/',
          },
          {
            number: '03',
            title: 'Commerce operations',
            description: 'Products, orders, discounts, shipping, and payments',
            href: '/en/cms/commerce/',
          },
        ],
      },
      {
        id: 'api',
        label: 'KScript API',
        description: 'Start with the basics, module index, or integrations',
        href: '/en/api/',
        routes: [
          {
            number: '01',
            title: 'Quick start',
            description: 'Understand the k object and create a server API',
            href: '/en/api/getting-started/',
          },
          {
            number: '02',
            title: 'Module reference',
            description: 'Find signatures, parameters, and examples by k.* module',
            href: '/en/api/',
          },
          {
            number: '03',
            title: 'External integrations',
            description: 'Call external OpenAPI definitions and manage authorization',
            href: '/en/api/openapi/',
          },
        ],
      },
    ],
  },
}

const activeIndex = ref(0)
const tabButtons = ref<HTMLButtonElement[]>([])
const content = computed(() => contentByLocale[props.locale])
const activeTab = computed(() => content.value.tabs[activeIndex.value])

function activateTab(index: number, moveFocus = false) {
  activeIndex.value = index

  if (moveFocus) {
    nextTick(() => tabButtons.value[index]?.focus())
  }
}

function handleTabKeydown(event: KeyboardEvent, index: number) {
  const lastIndex = content.value.tabs.length - 1
  let nextIndex: number | undefined

  if (event.key === 'ArrowRight') nextIndex = index === lastIndex ? 0 : index + 1
  if (event.key === 'ArrowLeft') nextIndex = index === 0 ? lastIndex : index - 1
  if (event.key === 'Home') nextIndex = 0
  if (event.key === 'End') nextIndex = lastIndex

  if (nextIndex !== undefined) {
    event.preventDefault()
    activateTab(nextIndex, true)
  }
}
</script>

<template>
  <div class="kb-doc-builder" :aria-label="content.builderLabel">
    <div class="kb-doc-builder__tabs" role="tablist" :aria-label="content.tabsLabel">
      <button
        v-for="(tab, index) in content.tabs"
        :id="`kb-doc-route-tab-${locale}-${tab.id}`"
        ref="tabButtons"
        :key="tab.id"
        type="button"
        role="tab"
        :class="{ 'is-active': activeIndex === index }"
        :aria-controls="`kb-doc-route-panel-${locale}-${tab.id}`"
        :aria-selected="activeIndex === index"
        :tabindex="activeIndex === index ? 0 : -1"
        @click="activateTab(index)"
        @keydown="handleTabKeydown($event, index)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      v-for="(tab, index) in content.tabs"
      v-show="activeIndex === index"
      :id="`kb-doc-route-panel-${locale}-${tab.id}`"
      :key="tab.id"
      class="kb-doc-builder__panel"
      role="tabpanel"
      tabindex="0"
      :aria-labelledby="`kb-doc-route-tab-${locale}-${tab.id}`"
    >
      <p>{{ tab.description }}</p>
      <div class="kb-doc-builder__routes">
        <a v-for="route in tab.routes" :key="route.href" :href="route.href">
          <span>{{ route.number }}</span>
          <strong>{{ route.title }}</strong>
          <em>{{ route.description }}</em>
        </a>
      </div>
    </div>

    <div class="kb-doc-builder__footer">
      <span>{{ content.ecosystem }}</span>
      <a :href="activeTab.href">{{ content.cta }}</a>
    </div>
  </div>
</template>
