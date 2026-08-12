<script setup lang="ts">
import { computed, ref } from 'vue'

type Locale = 'zh' | 'en'

interface ProductItem {
  id: string
  eyebrow: string
  title: string
  description: string
  href: string
  icon: string
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
        id: 'console',
        eyebrow: 'Console',
        title: '控制台',
        description: '域名、组织、数据中心、订单、余额、AI 配置',
        href: '/product/console',
        icon: '/home/icons/console.svg',
        image: '/product/console/console-overview.png',
        imageAlt: '控制台域名列表与功能导航界面',
      },
      {
        id: 'mailbox',
        eyebrow: 'Mailbox',
        title: '邮箱',
        description: '收发邮件、联系人、IMAP / SMTP、邮件扩展模块',
        href: '/product/mail',
        icon: '/home/icons/mail.svg',
        image: '/product/mail/mail-overview.png',
        imageAlt: 'Kooboo 邮箱收件箱界面',
      },
      {
        id: 'marketplace',
        eyebrow: 'Marketplace',
        title: '市场',
        description: '模板市场、模板详情、我的分享',
        href: '/product/market',
        icon: '/home/icons/marketplace.svg',
        image: '/product/market/templates-overview.png',
        imageAlt: 'Kooboo 市场模板浏览界面',
      },
      {
        id: 'developer-mode',
        eyebrow: 'Dev Tools',
        title: '开发者模式',
        description: '同时编辑页面、布局、视图、脚本、样式与代码',
        href: '/product/developer-mode',
        icon: '/home/icons/developer-mode.svg',
        image: '/product/developer-mode/developer-mode-overview.png',
        imageAlt: '开发者模式资源树与编辑工作区',
      },
      {
        id: 'ai-chat',
        eyebrow: 'ChatBot',
        title: 'AI Claw / AI Chat',
        description: '对话建站、实时预览与自动化任务',
        href: '/product/ai-chat',
        icon: '/home/icons/ai-claw.svg',
        image: '/product/ai-chat/ai-chat-overview.png',
        imageAlt: 'AI Claw 对话建站与实时预览工作区',
      },
      {
        id: 'balance',
        eyebrow: 'Balance',
        title: '余额与订单',
        description: '充值、订单、会员续费在控制台完成',
        href: '/product/console/balance',
        icon: '/home/icons/console.svg',
        image: '/product/console/balance-overview.png',
        imageAlt: '控制台余额与收支记录界面',
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
        id: 'domains',
        eyebrow: 'Domains',
        title: 'Domains',
        description: 'Bind and manage domains for a site',
        href: '/en/cms/settings/domains',
        icon: '/home/icons/console.svg',
        image: '/cms/settings/settings-domains-overview.png',
        imageAlt: 'Kooboo site domain management interface',
      },
      {
        id: 'mail',
        eyebrow: 'Mail',
        title: 'Mail APIs',
        description: 'Send and receive mail, IMAP / SMTP, and message parsing',
        href: '/en/api/mail/',
        icon: '/home/icons/mail.svg',
        image: '/product/mail/mail-overview.png',
        imageAlt: 'Kooboo mailbox inbox interface',
      },
      {
        id: 'products',
        eyebrow: 'Products',
        title: 'Product Management',
        description: 'Create products, variants, categories, and commerce content',
        href: '/en/cms/commerce/product-management',
        icon: '/home/icons/marketplace.svg',
        image: '/cms/commerce/product-management-list.png',
        imageAlt: 'Kooboo commerce product management interface',
      },
      {
        id: 'developer-mode',
        eyebrow: 'Dev Tools',
        title: 'Developer Mode',
        description: 'Edit pages, layouts, views, scripts, styles, and code together',
        href: '/en/cms/development/',
        icon: '/home/icons/developer-mode.svg',
        image: '/cms/development/code-overview.png',
        imageAlt: 'Kooboo development code management interface',
      },
      {
        id: 'ai-service',
        eyebrow: 'AI',
        title: 'AI Service',
        description: 'Configure AI providers and site-level AI settings',
        href: '/en/cms/settings/ai-service',
        icon: '/home/icons/ai-claw.svg',
        image: '/cms/settings/settings-ai-service-overview.png',
        imageAlt: 'Kooboo AI service settings interface',
      },
      {
        id: 'orders',
        eyebrow: 'Orders',
        title: 'Orders',
        description: 'Track orders, payment status, fulfillment, and commerce operations',
        href: '/en/cms/commerce/orders',
        icon: '/home/icons/console.svg',
        image: '/cms/commerce/orders-list.png',
        imageAlt: 'Kooboo commerce order management interface',
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
          :class="{ 'is-active': activeIndex === index }"
          @mouseenter="activateItem(index)"
          @focus="activateItem(index)"
        >
          <span class="kb-doc-product__eyebrow">{{ item.eyebrow }}</span>
          <span class="kb-doc-product__title">
            <span
              class="kb-doc-product__icon"
              :style="{ '--product-icon': `url(${item.icon})` }"
              aria-hidden="true"
            />
            <strong>{{ item.title }}</strong>
          </span>
          <em>{{ item.description }}</em>
          <span class="kb-doc-product__thumb" aria-hidden="true">
            <img class="no-zoom" :src="item.image" alt="">
          </span>
        </a>
      </nav>

      <a
        class="kb-doc-product__stage"
        :href="activeItem.href"
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
            >
          </Transition>
        </span>
      </a>
    </div>
  </section>
</template>
