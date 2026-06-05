import { defineConfig } from 'vitepress'
import { diagramPlugin } from 'vitepress-plugin-mermaid-diagram'

/** VitePress 左侧栏：路径前缀须匹配 `cms/**` 下的页面 */
const cmsSidebar = [
  {
    text: '后台 CMS',
    items: [
      { text: '概述', link: '/cms/' },
      {
        text: '入门',
        collapsed: false,
        items: [
          { text: '登录与站点列表', link: '/cms/getting-started/login-and-site-list' },
          { text: '新建站点', link: '/cms/getting-started/create-site' },
        ],
      },
      { text: '站点后台菜单总览', link: '/cms/navigation' },
      {
        text: '站点',
        collapsed: true,
        items: [
          { text: '控制面板', link: '/cms/site/dashboard' },
          { text: '媒体库', link: '/cms/site/media' },
          {
            text: '页面',
            collapsed: false,
            items: [
              { text: '页面列表', link: '/cms/site/pages' },
              { text: '页面设置', link: '/cms/site/pages-setting' },
              { text: '编辑代码', link: '/cms/site/pages-edit-code' },
              { text: '在线编辑', link: '/cms/site/pages-inline-edit' },
            ],
          },
        ],
      },
      {
        text: '内容',
        collapsed: true,
        items: [
          { text: '概述', link: '/cms/content/' },
          { text: '数据类型', link: '/cms/content/content-types' },
          {
            text: '内容',
            collapsed: true,
            items: [
              { text: '内容列表', link: '/cms/content/contents-folders-list' },
              { text: '内容设置', link: '/cms/content/contents-folder-settings' },
              { text: '内容条目', link: '/cms/content/contents-entries' },
            ],
          },
          { text: '标签', link: '/cms/content/labels' },
          { text: 'HTML 片段', link: '/cms/content/html-blocks' },
          { text: '文件', link: '/cms/content/files' },
          { text: '元素属性', link: '/cms/content/tag-attributes' },
          { text: '参数配置', link: '/cms/content/user-options' },
        ],
      },
      {
        text: '电商',
        collapsed: true,
        items: [
          { text: '概述', link: '/cms/commerce/' },
          {
            text: '商品管理',
            collapsed: false,
            items: [
              { text: '列表', link: '/cms/commerce/product-management' },
              { text: '新建与编辑', link: '/cms/commerce/product-management-detail' },
            ],
          },
          { text: '商品类型', link: '/cms/commerce/product-types' },
          { text: '商品分类', link: '/cms/commerce/product-categories' },
          { text: '购物车', link: '/cms/commerce/carts' },
          { text: '顾客管理', link: '/cms/commerce/customers' },
          { text: '订单', link: '/cms/commerce/orders' },
          { text: '销售统计', link: '/cms/commerce/sale-stats' },
          { text: '优惠折扣', link: '/cms/commerce/discounts' },
          { text: '货币', link: '/cms/commerce/currencies' },
          { text: '配送', link: '/cms/commerce/shippings' },
          { text: '会员', link: '/cms/commerce/loyalty' },
          { text: '税', link: '/cms/commerce/taxes' },
          { text: '通知', link: '/cms/commerce/notification' },
          { text: '设置', link: '/cms/commerce/settings' },
        ],
      },
      {
        text: '运维中心',
        collapsed: true,
        items: [
          { text: '概述', link: '/cms/operations/' },
          { text: '访问统计', link: '/cms/operations/visitor-logs' },
          { text: '资源守护', link: '/cms/operations/resource-guardian' },
          { text: '页面交互', link: '/cms/operations/page-interaction' },
          { text: 'AB 测试', link: '/cms/operations/ab-testing' },
          { text: '操作日志', link: '/cms/operations/site-logs' },
          { text: '协作同步', link: '/cms/operations/sync' },
        ],
      },
      {
        text: '开发',
        collapsed: true,
        items: [
          { text: '概述', link: '/cms/development/' },
          { text: '组件（Views）', link: '/cms/development/views' },
          { text: '布局（Layouts）', link: '/cms/development/layouts' },
          { text: '脚本', link: '/cms/development/scripts' },
          { text: '样式', link: '/cms/development/styles' },
          { text: '代码', link: '/cms/development/code' },
          { text: '代码日志', link: '/cms/development/code-log' },
          { text: '代码搜索', link: '/cms/development/code-search' },
          { text: 'URL', link: '/cms/development/urls' },
          { text: '表单', link: '/cms/development/forms' },
          { text: '菜单', link: '/cms/development/menus' },
          { text: '身份验证', link: '/cms/development/authentication' },
          { text: 'Open API', link: '/cms/development/openapis' },
          { text: 'SPA 多语言', link: '/cms/development/spa-multilingual' },
          { text: '模块', link: '/cms/development/modules' },
          { text: '定时任务', link: '/cms/development/jobs' },
        ],
      },
      {
        text: '数据库',
        collapsed: true,
        items: [
          { text: '概述', link: '/cms/database/' },
          { text: 'IndexedDB 表', link: '/cms/database/table' },
          { text: 'IndexedDB 表关系', link: '/cms/database/table-relation' },
          { text: '键值存储', link: '/cms/database/key-value' },
          { text: 'SQLite 表', link: '/cms/database/sqlite-table' },
          { text: 'MySQL 表', link: '/cms/database/mysql-table' },
          { text: 'SQL Server 表', link: '/cms/database/sqlserver-table' },
          { text: 'SQL 日志', link: '/cms/database/sql-logs' },
        ],
      },
    ],
  },
]

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
      { text: '后台 CMS', link: '/cms/' },
      { text: '模板引擎', link: '/templateEngine/' },
      { text: 'API 详情', link: '/api/' }
    ],
    sidebar: {
      '/cms/': cmsSidebar,
      '/cms': cmsSidebar,
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
                {
                  text: 'k-data',
                  collapsed: false,
                  items: [
                    { text: '概述', link: '/templateEngine/k-data/' },
                    { text: '标签语法', link: '/templateEngine/k-data/tags.md' },
                    { text: 'query 数据源', link: '/templateEngine/k-data/query.md' },
                    { text: '内置函数', link: '/templateEngine/k-data/functions.md' },
                    { text: '条件表达式', link: '/templateEngine/k-data/condition.md' },
                  ]
                },
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
                { text: 'indexedDb', link: '/api/indexed-db/' },
                { text: 'keyValue', link: '/api/key-value/' },
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
            { text: 'k.openApi', link: '/api/openapi/' },
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
            { text: 'k.paramConfig', link: '/api/param-config/' },
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
            { text: 'SPA 多语言', link: '/api/spa-multilingual/' },
            {
              text: 'k.site',
              collapsed: true,
              items: [
                { text: '概述', link: '/api/site/' },
                { text: 'codes', link: '/api/site/code.md' },
                { text: 'css', link: '/api/site/css.md' },
                { text: 'runJob', link: '/api/site/job.md' },
                { text: 'js', link: '/api/site/js.md' },
                { text: 'layouts', link: '/api/site/layout.md' },
                { text: 'menus', link: '/api/site/menu.md' },
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
