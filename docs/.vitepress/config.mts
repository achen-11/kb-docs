import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Kooboo',
  description: 'Kooboo Documentation',
  lang: 'zh-CN',
  ignoreDeadLinks: true,
  themeConfig: {
    siteTitle: 'Kooboo',
    nav: [
      { text: '最佳实践', link: '/guide/' },
      { text: 'API 详情', link: '/api/' }
    ],
    sidebar: {
      '/api/': [
        {
          text: '入门',
          items: [
            { text: '快速开始', link: '/api/getting-started/' },
            { text: '认证与授权', link: '/api/getting-started/auth.md' }
          ]
        },
        {
          text: '核心',
          items: [
            { text: 'k.api', link: '/api/core/api.md' },
            { text: 'k.request', link: '/api/core/request.md' },
            { text: 'k.response', link: '/api/core/response.md' },
            { text: 'k.session', link: '/api/core/session.md' },
            { text: 'k.cookie', link: '/api/core/cookie.md' },
            { text: 'k.security', link: '/api/core/security.md' }
          ]
        },
        {
          text: '数据',
          items: [
            {
              text: 'k.DB',
              collapsed: false,
              items: [
                { text: '概述', link: '/api/data/database.md' },
                { text: 'sqlite', link: '/api/data/sqlite/' }
              ]
            },
            { text: 'k.content', link: '/api/data/content.md' },
          ]
        },
        {
          text: '文件',
          collapsed: false,
          items: [
            { text: '概述', link: '/api/file/file.md' },
            { text: 'folder', link: '/api/file/file-folder.md' },
            { text: 'resumable', link: '/api/file/file-resumable.md' },
            { text: '数据结构', link: '/api/file/file-info.md' },
          ]
        },
        {
          text: '电商',
          items: [
            {
              text: 'k.commerce',
              collapsed: false,
              items: [
                { text: '概述', link: '/api/commerce/commerce.md' },
                { text: 'product', link: '/api/commerce/product.md' },
                { text: 'category', link: '/api/commerce/category.md' },
                { text: 'cart', link: '/api/commerce/cart.md' },
                { text: 'order', link: '/api/commerce/order.md' },
                { text: 'customer', link: '/api/commerce/customer.md' },
                { text: 'discount', link: '/api/commerce/discount.md' },
                { text: 'address', link: '/api/commerce/address.md' },
                { text: 'loyalty', link: '/api/commerce/loyalty.md' },
                { text: 'membership', link: '/api/commerce/membership.md' },
                { text: 'shipping', link: '/api/commerce/shipping.md' },
                { text: 'wishlist', link: '/api/commerce/wishlist.md' },
                { text: 'currency', link: '/api/commerce/currency.md' },
                { text: 'settings', link: '/api/commerce/settings.md' },
              ]
            }
          ]
        },
        {
          text: '多语言',
          items: [
            { text: 'k.label & k.t', link: '/api/site/label.md' }
          ]
        },
        {
          text: '站点',
          items: [
            { text: 'k.site', link: '/api/site/site.md' },
            { text: 'k.module', link: '/api/site/module.md' }
          ]
        },
        {
          text: '开发',
          items: [
            { text: "layout", link: '/api/site/layout.md' },
            { text: "page", link: '/api/site/page.md' },
            { text: "view", link: '/api/site/view.md' },
            { text: "css", link: '/api/site/css.md' },
            { text: "js", link: '/api/site/js.md' },
          ]
        },
        {
          text: '网络',
          items: [
            { text: 'k.net.httpClient', link: '/api/network/httpclient.md' },
            { text: 'k.net.webSocket', link: '/api/network/websocket.md' },
          ]
        }
      ]
    },
    search: {
      provider: 'local'
    },
    outline: {
      level: 'deep'
    }
  }
})
