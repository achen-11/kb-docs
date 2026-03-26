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
            { text: 'k.storage', link: '/api/data/storage.md' }
          ]
        },
        {
          text: '业务',
          items: [
            { text: 'k.commerce', link: '/api/business/commerce.md' },
            { text: 'k.payment', link: '/api/business/payment.md' },
            { text: 'k.emailMarketing', link: '/api/business/email-marketing.md' },
            { text: 'k.mail', link: '/api/business/mail.md' }
          ]
        },
        {
          text: '站点',
          items: [
            { text: 'k.site', link: '/api/site/site.md' },
            { text: 'k.page', link: '/api/site/page.md' },
            { text: 'k.label', link: '/api/site/label.md' },
            { text: 'k.file', link: '/api/site/file.md' },
            { text: 'k.module', link: '/api/site/module.md' }
          ]
        },
        {
          text: '网络',
          items: [
            { text: 'k.net.httpClient', link: '/api/network/httpclient.md' },
            { text: 'k.net.webSocket', link: '/api/network/websocket.md' },
            { text: 'k.net.DNS', link: '/api/network/dns.md' }
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
