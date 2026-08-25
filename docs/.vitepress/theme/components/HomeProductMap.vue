<script setup lang="ts">
import { computed, ref } from 'vue'

type Locale = 'zh' | 'en'

interface ProductItem {
  id: string
  eyebrow: string
  title: string
  description: string
  href: string
  external?: boolean
  icon: string
  iconColored?: boolean
  image: string
  imageAlt: string
}

interface ProductContent {
  title: string
  listLabel: string
  previewLabel: string
  openLabel: string
  items: ProductItem[]
}

const props = withDefaults(defineProps<{ locale?: Locale }>(), {
  locale: 'zh',
})

const contentByLocale: Record<Locale, ProductContent> = {
  zh: {
    title: 'Kooboo 产品地图',
    listLabel: 'Kooboo 产品文档入口',
    previewLabel: '真实界面预览',
    openLabel: '进入文档',
    items: [
      {
        id: 'admin-cms',
        eyebrow: 'Admin CMS',
        title: '站点后台',
        description: '管理站点、页面、媒体、内容、电商、开发与设置',
        href: '/cms/',
        icon: '/home/icons/admin-cms.svg',
        image: '/cms/site/dashboard.webp',
        imageAlt: 'Kooboo 站点后台控制面板',
      },
      {
        id: 'content',
        eyebrow: 'Content',
        title: '内容管理',
        description: '建立结构化内容模型并维护可复用的内容条目',
        href: '/cms/content/',
        icon: '/home/icons/mail.svg',
        image: '/cms/content/content-types-list.webp',
        imageAlt: 'Kooboo 内容类型管理界面',
      },
      {
        id: 'commerce',
        eyebrow: 'Commerce',
        title: '电商',
        description: '管理商品、购物车、订单、折扣、配送与支付',
        href: '/cms/commerce/',
        icon: '/home/icons/marketplace.svg',
        image: '/cms/commerce/product-management-list.webp',
        imageAlt: 'Kooboo 电商商品管理界面',
      },
      {
        id: 'development',
        eyebrow: 'Development',
        title: '开发工具',
        description: '使用页面、布局、视图、脚本、样式、代码与 API',
        href: '/cms/development/',
        icon: '/home/icons/developer-mode.svg',
        image: '/cms/development/code-edit-overview.webp',
        imageAlt: 'Kooboo 代码编辑界面',
      },
      {
        id: 'ai-chat',
        eyebrow: 'AI Claw',
        title: 'AI Claw / AI Chat',
        description: '对话建站、实时预览与自动化任务',
        href: 'https://www.kooboo.com/articles/native-ai',
        external: true,
        icon: '/home/icons/ai-claw.svg',
        iconColored: true,
        image: '/home/ai-claw-overview.webp',
        imageAlt: 'AI Claw 首页与对话输入区域',
      },
      {
        id: 'operations',
        eyebrow: 'Operations',
        title: '站点运维',
        description: '查看流量、保护资源、分析交互并审计变更',
        href: '/cms/operations/',
        icon: '/home/icons/console.svg',
        image: '/cms/operations/visitor-logs-overview.webp',
        imageAlt: 'Kooboo 访问统计与站点运维界面',
      },
    ],
  },
  en: {
    title: 'Kooboo Product Map',
    listLabel: 'Kooboo product documentation entries',
    previewLabel: 'Real interface preview',
    openLabel: 'Open documentation',
    items: [
      {
        id: 'admin-cms',
        eyebrow: 'Admin CMS',
        title: 'Site Administration',
        description: 'Manage sites, pages, media, content, commerce, development, and settings',
        href: '/cms/',
        icon: '/home/icons/admin-cms.svg',
        image: '/en/cms/site/dashboard.webp',
        imageAlt: 'Kooboo site administration dashboard',
      },
      {
        id: 'content',
        eyebrow: 'Content',
        title: 'Content Management',
        description: 'Model structured content and maintain reusable content entries',
        href: '/cms/content/',
        icon: '/home/icons/mail.svg',
        image: '/en/cms/content/content-types-list.webp',
        imageAlt: 'Kooboo content type management interface',
      },
      {
        id: 'commerce',
        eyebrow: 'Commerce',
        title: 'Commerce',
        description: 'Manage products, carts, orders, discounts, shipping, and payments',
        href: '/cms/commerce/',
        icon: '/home/icons/marketplace.svg',
        image: '/en/cms/commerce/product-management-list.webp',
        imageAlt: 'Kooboo commerce product management interface',
      },
      {
        id: 'development',
        eyebrow: 'Development',
        title: 'Development Tools',
        description: 'Work with pages, layouts, views, scripts, styles, code, and APIs',
        href: '/cms/development/',
        icon: '/home/icons/developer-mode.svg',
        image: '/en/cms/development/code-edit-overview.webp',
        imageAlt: 'Kooboo code editing interface',
      },
      {
        id: 'ai-chat',
        eyebrow: 'AI Claw',
        title: 'AI Claw / AI Chat',
        description: 'Build sites through conversation, preview changes live, and manage automated tasks',
        href: 'https://www.kooboo.com/articles/native-ai',
        external: true,
        icon: '/home/icons/ai-claw.svg',
        iconColored: true,
        image: '/home/ai-claw-overview.webp',
        imageAlt: 'AI Claw home screen and conversation composer',
      },
      {
        id: 'operations',
        eyebrow: 'Operations',
        title: 'Site Operations',
        description: 'Review traffic, protect resources, inspect interactions, and audit changes',
        href: '/cms/operations/',
        icon: '/home/icons/console.svg',
        image: '/en/cms/operations/visitor-logs-overview.webp',
        imageAlt: 'Kooboo visitor analytics and site operations interface',
      },
    ],
  },
}

const activeIndex = ref(0)
const content = computed(() => contentByLocale[props.locale])
const activeItem = computed(() => content.value.items[activeIndex.value])

function activateItem(index: number) {
  activeIndex.value = index
}
</script>

<template>
  <section class="kb-doc-product" :aria-labelledby="`kb-doc-product-title-${locale}`">
    <h2 :id="`kb-doc-product-title-${locale}`">{{ content.title }}</h2>
    <div class="kb-doc-product__layout">
      <nav class="kb-doc-product__list" :aria-label="content.listLabel">
        <a
          v-for="(item, index) in content.items"
          :key="item.id"
          :href="item.href"
          :target="item.external ? '_blank' : undefined"
          :rel="item.external ? 'noreferrer' : undefined"
          :class="{ 'is-active': activeIndex === index }"
          @mouseenter="activateItem(index)"
          @focus="activateItem(index)"
        >
          <span class="kb-doc-product__eyebrow">{{ item.eyebrow }}</span>
          <span class="kb-doc-product__title">
            <img
              v-if="item.iconColored"
              class="kb-doc-product__icon kb-doc-product__icon--colored no-zoom"
              :src="item.icon"
              alt=""
              aria-hidden="true"
            >
            <span
              v-else
              class="kb-doc-product__icon"
              :style="{ '--product-icon': `url(${item.icon})` }"
              aria-hidden="true"
            />
            <strong>{{ item.title }}</strong>
          </span>
          <em>{{ item.description }}</em>
          <span class="kb-doc-product__thumb" aria-hidden="true">
            <img
              class="no-zoom"
              :src="item.image"
              alt=""
              decoding="async"
              fetchpriority="low"
              loading="lazy"
            >
          </span>
        </a>
      </nav>

      <a
        class="kb-doc-product__stage"
        :href="activeItem.href"
        :target="activeItem.external ? '_blank' : undefined"
        :rel="activeItem.external ? 'noreferrer' : undefined"
        :aria-label="`${content.openLabel}: ${activeItem.title}`"
      >
        <span class="kb-doc-product__stage-caption">
          <span class="kb-doc-product__stage-copy">
            <small>{{ content.previewLabel }}</small>
            <strong>{{ activeItem.title }}</strong>
          </span>
          <em>{{ content.openLabel }} <span aria-hidden="true">↗</span></em>
        </span>
        <span class="kb-doc-product__stage-frame">
          <Transition name="kb-doc-product-preview" mode="out-in">
            <img
              :key="activeItem.image"
              class="no-zoom"
              :src="activeItem.image"
              :alt="activeItem.imageAlt"
              decoding="async"
              fetchpriority="low"
              loading="lazy"
            >
          </Transition>
        </span>
      </a>
    </div>
  </section>
</template>
