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
            // TODO
            { text: 'k.content', link: '/api/data/content.md' },
          ]
        },
        {
          text: '电商',
          items: [
            {
              text: 'k.commerce',
              collapsed: false,
              items: [
                { text: '概述', link: '/api/business/commerce.md' },
                { text: 'product', link: '/api/business/product.md' },
                { text: 'category', link: '/api/business/category.md' },
                { text: 'cart', link: '/api/business/cart.md' },
                { text: 'order', link: '/api/business/order.md' },
                { text: 'customer', link: '/api/business/customer.md' },
                { text: 'discount', link: '/api/business/discount.md' },
                { text: 'address', link: '/api/business/address.md' },
                { text: 'loyalty', link: '/api/business/loyalty.md' },
                { text: 'membership', link: '/api/business/membership.md' },
                { text: 'shipping', link: '/api/business/shipping.md' },
                { text: 'wishlist', link: '/api/business/wishlist.md' },
                { text: 'settings', link: '/api/business/settings.md' },
              ]
            }
          ]
        },
        {
          text: '站点',
          items: [
            { text: 'k.site', link: '/api/site/site.md' },
            { text: 'k.label', link: '/api/site/label.md' },
            { text: 'k.file', link: '/api/site/file.md' },
            { text: 'k.module', link: '/api/site/module.md' }
          ]
        },
        {
          text: '开发',
          items: [
            { text:"layout", link: '/api/site/layout.md' },
            { text:"page", link: '/api/site/page.md' },
            { text:"view", link: '/api/site/view.md' },
            { text:"css", link: '/api/site/css.md' },
            { text:"js", link: '/api/site/js.md' },
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
