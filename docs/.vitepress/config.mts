import { defineConfig } from 'vitepress'
import { diagramPlugin } from 'vitepress-plugin-mermaid-diagram'

export default defineConfig({
  title: 'Kooboo',
  description: 'Kooboo Documentation',
  lang: 'zh-CN',
  ignoreDeadLinks: true,
  markdown: {
    config(md) {
      md.use(diagramPlugin, { preview: true })
    },
  },
  rewrites: {
    'api/core/api.md': 'api/api/index.md',
    'api/core/cache.md': 'api/cache/index.md',
    'api/core/cookie.md': 'api/cookie/index.md',
    'api/core/request.md': 'api/request/index.md',
    'api/core/response.md': 'api/response/index.md',
    'api/core/security.md': 'api/security/index.md',
    'api/core/session.md': 'api/session/index.md',
    'api/core/state.md': 'api/state/index.md',
    'api/data/content.md': 'api/content/index.md',
    'api/data/database.md': 'api/database/index.md',
    'api/data/storage.md': 'api/storage/index.md',
    'api/data/sqlite/index.md': 'api/sqlite/index.md',
    'api/business/mail.md': 'api/mail/index.md',
    'api/logger/k-logger.md': 'api/logger/index.md',
    'api/site/site.md': 'api/site/index.md',
    'api/site/k-page.md': 'api/page/index.md',
    'api/site/label.md': 'api/label/index.md',
    'api/site/media.md': 'api/media/index.md',
    'api/site/module.md': 'api/module/index.md',
    'templateEngine/k-query.md': 'templateEngine/k-data/index.md',
    'templateEngine/layout.md': 'templateEngine/layout/index.md',
    'templateEngine/page.md': 'templateEngine/page/index.md',
    'templateEngine/view.md': 'templateEngine/view/index.md',
    'templateEngine/js.md': 'templateEngine/js/index.md',
    'templateEngine/css.md': 'templateEngine/css/index.md',
    'templateEngine/k-data.md': 'templateEngine/k-data/index.md',
    'templateEngine/template-binding-syntax.md': 'templateEngine/binding/index.md',
  },
  themeConfig: {
    siteTitle: 'Kooboo',
    nav: [
      { text: '最佳实践', link: '/guide/' },
      { text: '模板引擎', link: '/templateEngine/' },
      { text: 'API 详情', link: '/api/' }
    ],
    sidebar: {
      '/templateEngine/': [
        {
          text: '模板引擎',
          items: [
            { text: '概述', link: '/templateEngine/' },
            {
              text: '站点资源',
              collapsed: false,
              items: [
                { text: 'Layout（布局）', link: '/templateEngine/layout/' },
                { text: 'Page（页面）', link: '/templateEngine/page/' },
                { text: 'View（视图）', link: '/templateEngine/view/' },
                { text: 'Script（脚本）', link: '/templateEngine/js/' },
                { text: 'Style（样式）', link: '/templateEngine/css/' },
              ]
            },
            {
              text: '语法与数据',
              collapsed: false,
              items: [
                { text: '模板绑定语法', link: '/templateEngine/binding/' },
                { text: 'k-data', link: '/templateEngine/k-data/' },
              ]
            },
          ]
        }
      ],
      '/api/': [
        {
          text: '入门',
          items: [
            { text: '快速开始', link: '/api/getting-started/' },
            { text: '认证与授权', link: '/api/getting-started/auth.md' }
          ]
        },
        {
          text: 'KScript API（A–Z）',
          items: [
            {
              text: 'k.account',
              collapsed: true,
              items: [
                { text: '概述', link: '/api/account/' },
                { text: 'login', link: '/api/account/login.md' },
                { text: 'OAuth', link: '/api/account/oauth.md' },
                { text: 'organization', link: '/api/account/organization.md' },
                { text: 'user', link: '/api/account/user.md' },
              ]
            },
            { text: 'k.api', link: '/api/api/' },
            { text: 'k.cache', link: '/api/cache/' },
            {
              text: 'k.commerce',
              collapsed: true,
              items: [
                { text: '概述', link: '/api/commerce/commerce.md' },
                { text: 'address', link: '/api/commerce/address.md' },
                { text: 'cart', link: '/api/commerce/cart.md' },
                { text: 'category', link: '/api/commerce/category.md' },
                { text: 'currency', link: '/api/commerce/currency.md' },
                { text: 'customer', link: '/api/commerce/customer.md' },
                { text: 'discount', link: '/api/commerce/discount.md' },
                { text: 'loyalty', link: '/api/commerce/loyalty.md' },
                { text: 'membership', link: '/api/commerce/membership.md' },
                { text: 'order', link: '/api/commerce/order.md' },
                { text: 'product', link: '/api/commerce/product.md' },
                { text: 'settings', link: '/api/commerce/settings.md' },
                { text: 'shipping', link: '/api/commerce/shipping.md' },
                { text: 'wishlist', link: '/api/commerce/wishlist.md' },
              ]
            },
            { text: 'k.content', link: '/api/content/' },
            { text: 'k.cookie', link: '/api/cookie/' },
            {
              text: 'k.DB',
              collapsed: true,
              items: [
                { text: '概述', link: '/api/database/' },
                { text: 'sqlite', link: '/api/sqlite/' },
              ]
            },
            {
              text: 'k.file',
              collapsed: true,
              items: [
                { text: '概述', link: '/api/file/file.md' },
                { text: 'folder', link: '/api/file/file-folder.md' },
                { text: 'resumable', link: '/api/file/file-resumable.md' },
                { text: '数据结构', link: '/api/file/file-info.md' },
              ]
            },
            { text: 'k.label', link: '/api/label/' },
            { text: 'k.logger', link: '/api/logger/' },
            { text: 'k.mail', link: '/api/mail/' },
            { text: 'k.media', link: '/api/media/' },
            { text: 'k.module', link: '/api/module/' },
            {
              text: 'k.net',
              collapsed: true,
              items: [
                { text: '概述', link: '/api/net/' },
                { text: 'DNS', link: '/api/net/dns.md' },
                { text: 'httpClient', link: '/api/net/httpclient.md' },
                { text: 'IP', link: '/api/net/ip.md' },
                { text: 'url', link: '/api/net/url.md' },
                { text: 'webSocket', link: '/api/net/websocket.md' },
              ]
            },
            { text: 'k.page', link: '/api/page/' },
            {
              text: 'k.payment',
              collapsed: true,
              items: [
                { text: '概述', link: '/api/payment/' },
                { text: 'Alipay', link: '/api/payment/alipay.md' },
                { text: 'MoneyBoxs', link: '/api/payment/moneyboxs.md' },
                { text: 'Pay.NL', link: '/api/payment/paynl.md' },
                { text: 'PayPal', link: '/api/payment/paypal.md' },
                { text: 'Square', link: '/api/payment/square.md' },
                { text: 'Stripe', link: '/api/payment/stripe.md' },
                { text: 'TwoCheckout', link: '/api/payment/two-checkout.md' },
                { text: 'Wechat', link: '/api/payment/wechat.md' },
                { text: 'Wechat H5 Flow', link: '/api/payment/wechat-h5-flow.md' },
              ]
            },
            { text: 'k.request', link: '/api/request/' },
            { text: 'k.response', link: '/api/response/' },
            { text: 'k.security', link: '/api/security/' },
            { text: 'k.session', link: '/api/session/' },
            {
              text: 'k.site',
              collapsed: true,
              items: [
                { text: '概述', link: '/api/site/' },
                { text: 'codes', link: '/api/site/code.md' },
                { text: 'css', link: '/api/site/css.md' },
                { text: 'js', link: '/api/site/js.md' },
                { text: 'layouts', link: '/api/site/layout.md' },
                { text: 'pages', link: '/api/site/page.md' },
                { text: 'views', link: '/api/site/view.md' },
              ]
            },
            { text: 'k.state', link: '/api/state/' },
            { text: 'k.storage', link: '/api/storage/' },
            {
              text: 'k.utils',
              collapsed: true,
              items: [
                { text: '概述', link: '/api/utils/' },
                { text: 'CDN', link: '/api/utils/cdn.md' },
                { text: 'clientJS', link: '/api/utils/clientJS.md' },
                { text: 'community', link: '/api/utils/community.md' },
                { text: 'compression', link: '/api/utils/compression.md' },
                { text: 'converter', link: '/api/utils/converter.md' },
                { text: 'CRM', link: '/api/utils/crm.md' },
                { text: 'date', link: '/api/utils/date.md' },
                { text: 'dom', link: '/api/utils/dom.md' },
                { text: 'google', link: '/api/utils/google.md' },
                { text: 'image', link: '/api/utils/image.md' },
                { text: 'inlineHtml', link: '/api/utils/inlineHtml.md' },
                { text: 'IP', link: '/api/utils/ip.md' },
                { text: 'mime', link: '/api/utils/mime.md' },
                { text: 'ninjible', link: '/api/utils/ninjible.md' },
                { text: 'office', link: '/api/utils/office.md' },
                { text: 'puppeteer', link: '/api/utils/puppeteer.md' },
                { text: 'screenShot', link: '/api/utils/screenShot.md' },
                { text: 'sftpClient', link: '/api/utils/sftpClient.md' },
                { text: 'sitemap', link: '/api/utils/sitemap.md' },
                { text: 'sms', link: '/api/utils/sms.md' },
                { text: 'sshClient', link: '/api/utils/sshClient.md' },
                { text: 'string', link: '/api/utils/string.md' },
                { text: 'telnetClient', link: '/api/utils/telnetClient.md' },
                { text: 'template', link: '/api/utils/template.md' },
                { text: 'uri', link: '/api/utils/uri.md' },
                { text: 'xml', link: '/api/utils/xml.md' },
              ]
            },
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
