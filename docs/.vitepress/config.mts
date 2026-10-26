import { defineConfig } from 'vitepress'
import { diagramPlugin } from 'vitepress-plugin-mermaid-diagram'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createEditLinkConfig } from './editor-link.mjs'
import { exportPublishedMarkdown } from '../../scripts/export-published-markdown.mjs'
import { canonicalDocPath, createDocSeo, DOCS_ORIGIN } from '../../scripts/docs-seo.mjs'
import {
  PUBLISH_CLI,
  PUBLISH_PRODUCT_FEATURES,
  PUBLISH_ZH,
  UNPUBLISHED_EN_SRC_GLOBS,
  UNPUBLISHED_INTERNAL_SRC_GLOBS,
  UNPUBLISHED_ZH_SRC_GLOBS,
  canonicalPathFromLegacyEnglish,
  isUnpublishedPublicRoute,
  rewriteLegacyEnglishHrefs,
  stripEnglishUrlPrefix,
} from '../../scripts/docs-publish-locale.mjs'

const DOCS_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const EDITOR_BASE_URL = process.env.DOCS_EDITOR_BASE_URL
const zhEditLink = createEditLinkConfig(EDITOR_BASE_URL, '在编辑平台打开')
const enEditLink = createEditLinkConfig(EDITOR_BASE_URL, 'Open in documentation editor')
const LEGACY_ENGLISH_REDIRECT_HTML = `<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=/">
  <link rel="canonical" href="/">
  <meta name="robots" content="noindex">
  <title>Kooboo Documentation</title>
  <script>location.replace("/")</script>
</head>
<body>
  <p><a href="/">Kooboo Documentation</a></p>
</body>
</html>
`

/**
 * 最佳实践（docs/guide/**）发布开关。
 * false：本地保留源文件，但不进 nav / sidebar / dist（dev 与 build 均不生成路由）。
 * 恢复发布时改为 true 即可。
 */
const PUBLISH_GUIDE = false

function createLegacyEnglishRedirectPlugin() {
  return {
    name: 'kb-docs-legacy-english-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || ''
        if (url.includes('.md') || url.includes('/@') || url.includes('/@fs/')) {
          next()
          return
        }
        if (isUnpublishedPublicRoute(url)) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end('Not Found')
          return
        }
        const location = canonicalPathFromLegacyEnglish(url)
        if (!location) {
          next()
          return
        }
        res.statusCode = 302
        res.setHeader('Location', location)
        res.end()
      })
    },
  }
}

async function removeImageFiles(targetDir: string) {
  let entries
  try {
    entries = await readdir(targetDir, { withFileTypes: true })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return
    throw error
  }

  await Promise.all(entries.map(async (entry) => {
    const absolutePath = path.join(targetDir, entry.name)
    if (entry.isDirectory()) {
      await removeImageFiles(absolutePath)
      return
    }
    if (/\.(?:png|jpe?g|gif|webp|svg|avif|ico)$/iu.test(entry.name)) {
      await rm(absolutePath, { force: true })
    }
  }))
}

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
      {
        text: '站点设置',
        collapsed: true,
        items: [
          { text: '概述', link: '/cms/settings/' },
          {
            text: '基础设置',
            collapsed: true,
            items: [
              { text: '概述', link: '/cms/settings/basic/' },
              { text: '基础', link: '/cms/settings/basic/general' },
              { text: '访问控制', link: '/cms/settings/basic/access' },
              { text: '性能', link: '/cms/settings/basic/performance' },
              { text: 'SEO', link: '/cms/settings/basic/seo' },
              { text: '编辑器', link: '/cms/settings/basic/editor' },
              { text: '高级', link: '/cms/settings/basic/advanced' },
            ],
          },
          { text: '域名管理', link: '/cms/settings/domains' },
          {
            text: '服务集成',
            collapsed: true,
            items: [
              { text: '概述', link: '/cms/settings/integrations/' },
              { text: 'Database', link: '/cms/settings/integrations/database' },
              { text: 'Payment', link: '/cms/settings/integrations/payment' },
              { text: 'SMS', link: '/cms/settings/integrations/sms' },
              { text: 'OAuth2', link: '/cms/settings/integrations/oauth2' },
              { text: 'Storage', link: '/cms/settings/integrations/storage' },
              { text: 'Others', link: '/cms/settings/integrations/others' },
            ],
          },
          { text: '站点用户', link: '/cms/settings/site-users' },
          { text: '角色权限', link: '/cms/settings/roles' },
          { text: '请求 Hook', link: '/cms/settings/request-hooks' },
          { text: '操作 Hook', link: '/cms/settings/action-hooks' },
          { text: 'Cookie', link: '/cms/settings/cookie' },
          { text: 'AI 服务', link: '/cms/settings/ai-service' },
        ],
      },
    ],
  },
]

const guideSidebar = [
  {
    text: '最佳实践',
    items: [
      { text: '总览', link: '/guide/' },
      {
        text: '账号与权限',
        collapsed: false,
        items: [
          { text: '登录鉴权总览', link: '/guide/auth/' },
          { text: '密码登录 / 登出', link: '/guide/auth/password-login' },
          { text: '邮箱注册与找回密码', link: '/guide/auth/email-register-reset' },
          { text: '短信验证码登录', link: '/guide/auth/sms-login' },
          { text: '会话、角色与权限', link: '/guide/auth/sessions-and-roles' },
        ],
      },
      {
        text: '内容与站点',
        collapsed: false,
        items: [
          { text: '内容驱动列表/详情页', link: '/guide/content/content-driven-pages' },
          { text: '表单提交与服务端校验', link: '/guide/content/forms' },
          { text: '动态菜单与导航', link: '/guide/content/dynamic-navigation' },
          { text: '文件上传', link: '/guide/content/file-upload' },
          { text: '多语言站点', link: '/guide/content/multilingual-site' },
        ],
      },
      {
        text: '电商',
        collapsed: false,
        items: [
          { text: '购物车到结算', link: '/guide/commerce/checkout' },
          { text: '支付发起与回调', link: '/guide/commerce/payment-callbacks' },
          { text: '订单履约与通知', link: '/guide/commerce/order-fulfillment' },
        ],
      },
      {
        text: '性能',
        collapsed: false,
        items: [
          { text: 'API 响应缓存', link: '/guide/performance/api-cache' },
          { text: '页面片段缓存', link: '/guide/performance/page-fragment-cache' },
        ],
      },
      {
        text: '实时通信',
        collapsed: false,
        items: [
          { text: 'WebSocket 实时通信', link: '/guide/realtime/websocket' },
        ],
      },
      {
        text: '安全',
        collapsed: false,
        items: [
          { text: 'URL 解析与安全跳转', link: '/guide/security/safe-redirect' },
          { text: 'CSRF 与重复提交防护', link: '/guide/security/csrf-idempotency' },
          { text: '密码哈希与敏感信息保护', link: '/guide/security/password-hash' },
          { text: '访问控制与 API 防越权', link: '/guide/security/access-control' },
        ],
      },
      {
        text: '数据',
        collapsed: false,
        items: [
          { text: 'KeyValue 配置与缓存', link: '/guide/data/keyvalue-config' },
          { text: 'SQLite 业务模块 CRUD', link: '/guide/data/sqlite-crud' },
        ],
      },
      {
        text: '媒体与文件',
        collapsed: false,
        items: [
          { text: '媒体库选择与前台展示', link: '/guide/media/media-gallery' },
        ],
      },
      {
        text: '搜索与筛选',
        collapsed: false,
        items: [
          { text: '内容搜索页', link: '/guide/search/content-search' },
        ],
      },
      {
        text: '站点资源',
        collapsed: false,
        items: [
          { text: '代码生成资源与回滚', link: '/guide/site-resources/resource-rollback' },
        ],
      },
      {
        text: '通知与集成',
        collapsed: false,
        items: [
          { text: 'HTTPClient 调用第三方接口', link: '/guide/integrations/httpclient-services' },
          { text: '邮件与短信通知', link: '/guide/integrations/email-sms-notifications' },
          { text: 'OpenAPI 外部服务', link: '/guide/integrations/openapi-services' },
          { text: 'Webhook 接收与验签', link: '/guide/integrations/webhook-signature' },
          { text: '定时任务', link: '/guide/integrations/scheduled-jobs' },
        ],
      },
      {
        text: '日志与排错',
        collapsed: false,
        items: [
          { text: '业务日志与错误追踪', link: '/guide/troubleshooting/business-logging' },
          { text: '统一 API 响应与错误结构', link: '/guide/troubleshooting/api-error-contract' },
        ],
      },
      {
        text: '运营',
        collapsed: false,
        items: [
          { text: '页面交互埋点', link: '/guide/operations/interaction-tracking' },
          { text: 'AB 测试落地', link: '/guide/operations/ab-testing' },
          { text: 'Sitemap / SEO 自动化', link: '/guide/operations/sitemap-seo' },
        ],
      },
    ],
  },
]

const cliSidebar = [
  {
    text: 'Kooboo CLI',
    items: [
      { text: '总览', link: '/cli/' },
      {
        text: '开始使用',
        collapsed: false,
        items: [
          { text: '使用前准备', link: '/cli/getting-started/preparation' },
          { text: '新建或克隆项目', link: '/cli/getting-started/create-or-clone' },
        ],
      },
      {
        text: '项目',
        collapsed: false,
        items: [
          { text: '项目资源与目录', link: '/cli/project/resources' },
        ],
      },
      {
        text: '同步与发布',
        collapsed: false,
        items: [
          { text: '拉取远端资源', link: '/cli/workflows/pull' },
          { text: '推送本地资源', link: '/cli/workflows/push' },
          { text: '部署 Git 产物', link: '/cli/workflows/deploy' },
          { text: '持续同步', link: '/cli/workflows/sync' },
        ],
      },
      {
        text: '维护',
        collapsed: false,
        items: [
          { text: '资源对账与远端清理', link: '/cli/workflows/check-and-prune' },
          { text: '导出站点', link: '/cli/workflows/export' },
        ],
      },
      { text: '常见问题', link: '/cli/troubleshooting' },
    ],
  },
]

const enCliSidebar = [
  {
    text: 'Kooboo CLI',
    items: [
      { text: 'Overview', link: '/cli/' },
      {
        text: 'Getting Started',
        collapsed: false,
        items: [
          { text: 'Before You Start', link: '/cli/getting-started/preparation' },
          { text: 'Create or Clone a Project', link: '/cli/getting-started/create-or-clone' },
        ],
      },
      {
        text: 'Project',
        collapsed: false,
        items: [
          { text: 'Project Resources and Folders', link: '/cli/project/resources' },
        ],
      },
      {
        text: 'Synchronization and Deployment',
        collapsed: false,
        items: [
          { text: 'Pull Remote Resources', link: '/cli/workflows/pull' },
          { text: 'Push Local Resources', link: '/cli/workflows/push' },
          { text: 'Deploy Git Artifacts', link: '/cli/workflows/deploy' },
          { text: 'Continuous Synchronization', link: '/cli/workflows/sync' },
        ],
      },
      {
        text: 'Maintenance',
        collapsed: false,
        items: [
          { text: 'Compare and Clean Remote Resources', link: '/cli/workflows/check-and-prune' },
          { text: 'Export a Site', link: '/cli/workflows/export' },
        ],
      },
      { text: 'Troubleshooting', link: '/cli/troubleshooting' },
    ],
  },
]

const quickStartSidebar = [
  {
    text: '快速开始',
    items: [
      { text: '总览', link: '/quick-start/' },
      { text: '创建第一个站点', link: '/quick-start/create-first-site' },
      { text: '做第一个页面', link: '/quick-start/build-first-page' },
      { text: '添加内容', link: '/quick-start/add-content' },
      { text: '发布与域名', link: '/quick-start/publish-domain' },
      { text: '写第一个 KScript API', link: '/quick-start/add-script-api' },
    ],
  },
]

const productSidebar = [
  {
    text: '产品功能',
    items: [
      { text: '总览', link: '/product/' },
      {
        text: '控制台',
        collapsed: false,
        items: [
          { text: '概述', link: '/product/console' },
          { text: '域名', link: '/product/console/domains' },
          { text: '组织', link: '/product/console/organization' },
          { text: '数据中心', link: '/product/console/data-centers' },
          { text: 'Google SC', link: '/product/console/google-search-console' },
          { text: '会员', link: '/product/console/membership' },
          { text: 'AI 配置', link: '/product/console/ai-config' },
          { text: '订单', link: '/product/console/orders' },
          { text: '余额', link: '/product/console/balance' },
          { text: '续费', link: '/product/console/renewals' },
        ],
      },
      {
        text: '邮箱',
        collapsed: false,
        items: [
          { text: '概述', link: '/product/mail' },
          { text: '邮件列表', link: '/product/mail/messages' },
          { text: '日历', link: '/product/mail/calendar' },
          { text: '撰写邮件', link: '/product/mail/compose' },
          { text: '邮箱地址', link: '/product/mail/addresses' },
          { text: '联系人', link: '/product/mail/contacts' },
          { text: '安全报告', link: '/product/mail/security-report' },
          { text: 'IMAP', link: '/product/mail/imap' },
          { text: '邮件扩展模块', link: '/product/mail/modules' },
          { text: 'Inbox Logo', link: '/product/mail/inbox-logo' },
          { text: 'SMTP', link: '/product/mail/smtp' },
        ],
      },
      { text: '市场', link: '/product/market' },
      { text: '开发者模式', link: '/product/developer-mode' },
      { text: 'AI Claw / AI Chat', link: '/product/ai-chat' },
      { text: 'AI 悬浮助手', link: '/product/ai-floating-assistant' },
    ],
  },
]

function prefixLocalePath(pathname: string, localePrefix: string) {
  if (!localePrefix) return pathname
  if (!pathname.startsWith('/')) return pathname
  if (pathname === '/') return `${localePrefix}/`
  if (pathname === localePrefix || pathname.startsWith(`${localePrefix}/`)) return pathname
  return `${localePrefix}${pathname}`.replace(/\/{2,}/g, '/')
}

function prefixLocaleNav(
  nav: Array<{ text: string; link?: string; items?: Array<{ text: string; link: string }> }>,
  localePrefix: string
) {
  return nav.map((item) => ({
    ...item,
    link: item.link ? prefixLocalePath(item.link, localePrefix) : undefined,
    items: item.items
      ? item.items.map((navItem) => ({
          ...navItem,
          link: prefixLocalePath(navItem.link, localePrefix),
        }))
      : undefined,
  }))
}

function prefixLocaleSidebarItems(items: any[], localePrefix: string): any[] {
  return items.map((item) => ({
    ...item,
    link: item.link ? prefixLocalePath(item.link, localePrefix) : undefined,
    items: item.items ? prefixLocaleSidebarItems(item.items, localePrefix) : undefined,
  }))
}

function prefixLocaleSidebarMap(sidebar: Record<string, any[]>, localePrefix: string) {
  return Object.fromEntries(
    Object.entries(sidebar).map(([pathname, items]) => [
      prefixLocalePath(pathname, localePrefix),
      prefixLocaleSidebarItems(items, localePrefix),
    ])
  )
}

function resolveDocPath(pathname: string) {
  const normalized = pathname.replace(/^\/+/, '')
  const searchPaths = normalized.startsWith('en/') ? [normalized] : [`en/${normalized}`, normalized]
  const files = searchPaths.flatMap((candidate) => (
    candidate.endsWith('.md')
      ? [path.join(DOCS_ROOT, candidate)]
      : [
          path.join(DOCS_ROOT, candidate, 'index.md'),
          path.join(DOCS_ROOT, `${candidate}.md`),
        ]
  ))

  return files.find((candidate) => existsSync(candidate)) || null
}

function readDocTitle(pathname: string) {
  const file = resolveDocPath(pathname)
  if (!file) return null

  const match = readFileSync(file, 'utf8').match(/^#\s+(.+)$/m)
  return match?.[1]?.trim() || null
}

function containsChinese(text: string) {
  return /[\u3400-\u9fff]/.test(text)
}

function shouldKeepOriginalSidebarText(text: string) {
  return !containsChinese(text)
}

function buildEnglishSidebarItems(
  items: any[],
  localePrefix: string,
  textMap: Record<string, string>
): any[] {
  return items.map((item) => {
    const localizedLink = item.link ? prefixLocalePath(item.link, localePrefix) : undefined
    const localizedItems = item.items
      ? buildEnglishSidebarItems(item.items, localePrefix, textMap)
      : undefined
    const mappedText = textMap[item.text]
    const titleFromDoc =
      localizedLink && !shouldKeepOriginalSidebarText(item.text)
        ? readDocTitle(localizedLink)
        : null

    return {
      ...item,
      text: mappedText || titleFromDoc || item.text,
      link: localizedLink,
      items: localizedItems,
    }
  })
}

function buildEnglishSidebarMap(
  sidebar: Record<string, any[]>,
  localePrefix: string,
  textMap: Record<string, string>
) {
  return Object.fromEntries(
    Object.entries(sidebar).map(([pathname, items]) => [
      prefixLocalePath(pathname, localePrefix),
      buildEnglishSidebarItems(items, localePrefix, textMap),
    ])
  )
}

const templateEngineSidebar = [
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
          {
            text: '模板绑定语法',
            link: '/templateEngine/binding/',
            collapsed: false,
            items: [
              { text: 'env="server"', link: '/templateEngine/binding/#env-server' },
              { text: 'k-define', link: '/templateEngine/binding/#k-define' },
              { text: 'k-if', link: '/templateEngine/binding/#k-if' },
              { text: 'k-else-if', link: '/templateEngine/binding/#k-else-if' },
              { text: 'k-else', link: '/templateEngine/binding/#k-else' },
              { text: 'k-for', link: '/templateEngine/binding/#k-for' },
              { text: 'k-content', link: '/templateEngine/binding/#k-content' },
              { text: 'k-attribute', link: '/templateEngine/binding/#k-attribute' },
              { text: 'k-label', link: '/templateEngine/binding/#k-label' },
              { text: 'type="module"', link: '/templateEngine/binding/#type-module' },
            ]
          },
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
]

const apiSidebar = [
  {
    text: '入门',
    items: [
      { text: '快速开始', link: '/api/getting-started/' },
      { text: 'KScript 语言与运行时', link: '/api/getting-started/runtime.md' },
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
      { text: 'k.google', link: '/api/google/' },
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
          { text: 'ping', link: '/api/net/ping.md' },
          { text: 'sftpClient', link: '/api/net/sftpClient.md' },
          { text: 'sshClient', link: '/api/net/sshClient.md' },
          { text: 'telnetClient', link: '/api/net/telnetClient.md' },
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
          { text: 'image', link: '/api/utils/image.md' },
          { text: 'inlineHtml', link: '/api/utils/inlineHtml.md' },
          { text: 'mime', link: '/api/utils/mime.md' },
          { text: 'ninjible', link: '/api/utils/ninjible.md' },
          { text: 'office', link: '/api/utils/office.md' },
          { text: 'puppeteer', link: '/api/utils/puppeteer.md' },
          { text: 'screenShot', link: '/api/utils/screenShot.md' },
          { text: 'sitemap', link: '/api/utils/sitemap.md' },
          { text: 'sms', link: '/api/utils/sms.md' },
          { text: 'string', link: '/api/utils/string.md' },
          { text: 'template', link: '/api/utils/template.md' },
          { text: 'uri', link: '/api/utils/uri.md' },
          { text: 'xml', link: '/api/utils/xml.md' },
        ]
      },
    ]
  }
]

const zhNav = [
  { text: '快速开始', link: '/quick-start/' },
  ...(PUBLISH_PRODUCT_FEATURES ? [{ text: '产品功能', link: '/product/' }] : []),
  { text: '后台 CMS', link: '/cms/' },
  { text: '模板引擎', link: '/templateEngine/' },
  ...(PUBLISH_CLI ? [{ text: 'Kooboo CLI', link: '/cli/' }] : []),
  { text: 'API 详情', link: '/api/' },
  ...(PUBLISH_GUIDE ? [{ text: '最佳实践', link: '/guide/' }] : []),
  { text: '官网', link: 'https://www.kooboo.com/' },
]

const enNav = [
  { text: 'Quick Start', link: '/quick-start/' },
  ...(PUBLISH_PRODUCT_FEATURES ? [{ text: 'Product Features', link: '/product/' }] : []),
  { text: 'Admin CMS', link: '/cms/' },
  { text: 'Template Engine', link: '/templateEngine/' },
  ...(PUBLISH_CLI ? [{ text: 'Kooboo CLI', link: '/cli/' }] : []),
  { text: 'API Details', link: '/api/' },
  { text: 'Official Site', link: 'https://www.kooboo.com/' },
]

const englishSidebarTextMap = {
  '产品功能': 'Product Features',
  '控制台': 'Console',
  '域名': 'Domains',
  '组织': 'Organization',
  '数据中心': 'Data Centers',
  '会员': 'Membership',
  'AI 配置': 'AI Configuration',
  '订单': 'Orders',
  '余额': 'Balance',
  '续费': 'Renewals',
  '邮箱': 'Mailbox',
  '邮件列表': 'Messages',
  '日历': 'Calendar',
  '撰写邮件': 'Compose',
  '邮箱地址': 'Mail Addresses',
  '联系人': 'Contacts',
  '安全报告': 'Security Reports',
  '邮件扩展模块': 'Mail Extensions',
  '市场': 'Marketplace',
  '开发者模式': 'Developer Mode',
  'AI 悬浮助手': 'AI Floating Assistant',
  '创建第一个站点': 'Create Your First Site',
  '做第一个页面': 'Build Your First Page',
  '添加内容': 'Add Content',
  '发布与域名': 'Publish and Domains',
  '写第一个 KScript API': 'Write Your First KScript API',
  '后台 CMS': 'Admin CMS',
  '模板引擎': 'Template Engine',
  '快速开始': 'Quick Start',
  'KScript 语言与运行时': 'KScript Language and Runtime',
  '入门': 'Getting Started',
  '概述': 'Overview',
  '总览': 'Overview',
  '站点': 'Site',
  '页面': 'Pages',
  '内容': 'Content',
  '电商': 'Commerce',
  '商品管理': 'Product Management',
  '运维中心': 'Operations',
  '开发': 'Development',
  '数据库': 'Database',
  '站点设置': 'Site Settings',
  '基础设置': 'Basic Settings',
  '服务集成': 'Integrations',
  '站点资源': 'Site Resources',
  '语法与数据': 'Syntax and Data',
  'KScript API（A–Z）': 'KScript API (A-Z)',
}

const zhSidebar = {
  '/quick-start/': quickStartSidebar,
  '/quick-start': quickStartSidebar,
  ...(PUBLISH_PRODUCT_FEATURES
    ? {
        '/product/': productSidebar,
        '/product': productSidebar,
      }
    : {}),
  ...(PUBLISH_GUIDE
    ? {
        '/guide/': guideSidebar,
        '/guide': guideSidebar,
      }
    : {}),
  ...(PUBLISH_CLI
    ? {
        '/cli/': cliSidebar,
        '/cli': cliSidebar,
      }
    : {}),
  '/cms/': cmsSidebar,
  '/cms': cmsSidebar,
  '/templateEngine/': templateEngineSidebar,
  '/api/': apiSidebar,
}

const enSidebar = {
  ...(PUBLISH_CLI
    ? {
        '/cli/': enCliSidebar,
        '/cli': enCliSidebar,
      }
    : {}),
  ...buildEnglishSidebarMap(
    {
      '/quick-start/': quickStartSidebar,
      '/quick-start': quickStartSidebar,
      ...(PUBLISH_PRODUCT_FEATURES
        ? {
            '/product/': productSidebar,
            '/product': productSidebar,
          }
        : {}),
      '/cms/': cmsSidebar,
      '/cms': cmsSidebar,
      '/templateEngine/': templateEngineSidebar,
      '/api/': apiSidebar,
      '/api': apiSidebar,
    },
    '',
    englishSidebarTextMap
  ),
}

const srcExclude = [
  'public/**',
  ...(PUBLISH_GUIDE ? [] : ['guide/**']),
  ...(PUBLISH_ZH ? [] : UNPUBLISHED_ZH_SRC_GLOBS),
  ...UNPUBLISHED_EN_SRC_GLOBS,
  ...UNPUBLISHED_INTERNAL_SRC_GLOBS,
]

const zhLocale = {
  label: '简体中文',
  lang: 'zh-CN',
  title: 'Kooboo',
  description: 'Kooboo Documentation',
  themeConfig: {
    editLink: zhEditLink,
    lastUpdated: {
      text: '最后编辑时间',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short',
        forceLocale: true,
      },
    },
    logo: {
      src: '/kooboo-logo.svg',
      alt: 'Kooboo',
    },
    siteTitle: false,
    nav: zhNav,
    sidebar: zhSidebar,
    langMenuLabel: '语言',
  },
}

const enLocale = {
  label: 'English',
  lang: 'en-US',
  title: 'Kooboo',
  description: 'Kooboo Documentation',
  themeConfig: {
    editLink: enEditLink,
    lastUpdated: {
      text: 'Last edited',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short',
        forceLocale: true,
      },
    },
    logo: {
      src: '/kooboo-logo.svg',
      alt: 'Kooboo',
    },
    siteTitle: false,
    nav: enNav,
    sidebar: enSidebar,
    langMenuLabel: 'Languages',
  },
}

export default defineConfig({
  cacheDir: process.env.DOCS_VITEPRESS_CACHE_DIR || undefined,
  ignoreDeadLinks: true,
  lastUpdated: true,
  sitemap: {
    hostname: DOCS_ORIGIN,
    transformItems(items) {
      return items.filter((item) => item.url !== '404.html' && item.url !== '/404.html')
        .map((item) => ({
          ...item,
          url: canonicalDocPath(item.url.endsWith('/') || !item.url ? `${item.url}index.md` : item.url),
        }))
    },
  },
  transformPageData(pageData, { siteConfig }) {
    if (pageData.relativePath === '404.md') {
      pageData.frontmatter.head = [...(pageData.frontmatter.head || []), ['meta', { name: 'robots', content: 'noindex' }]]
      return
    }
    const sourcePath = siteConfig.rewrites.inv[pageData.relativePath] || pageData.relativePath
    const seo = createDocSeo(pageData, readFileSync(path.join(siteConfig.srcDir, sourcePath), 'utf8'))
    pageData.title = seo.title
    pageData.description = seo.description
    pageData.frontmatter.title = seo.title
    pageData.frontmatter.description = seo.description
    pageData.frontmatter.head = [
      ...(pageData.frontmatter.head || []).filter(([tag, attrs]) => !(tag === 'link' && attrs.rel === 'canonical')),
      ['link', { rel: 'canonical', href: seo.canonical }],
    ]
  },
  lang: 'en-US',
  head: [
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
  ],
  // English sources live in docs/en/** and are rewritten to `/`. Future Chinese will be `/zh/`.
  srcExclude,
  vite: {
    plugins: [createLegacyEnglishRedirectPlugin()],
    build: {
      rollupOptions: {
        output: {
          // 勿改 entryFileNames：VitePress SSR 阶段依赖 .temp/app.js
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
    server: {
      watch: {
        ignored: ['**/.vitepress/dist/**', '**/.vitepress/.temp/**'],
      },
    },
  },
  transformHtml(code) {
    const rewritten = rewriteLegacyEnglishHrefs(code)
    return rewritten.replace(
      /<svg([^>]*\srole="img"[^>]*)>/g,
      (svg, attributes) => (
        /\baria-(?:label|labelledby)=/.test(attributes)
          ? svg
          : `<svg${attributes} aria-label="Diagram">`
      )
    )
  },
  async buildEnd(siteConfig) {
    await exportPublishedMarkdown(siteConfig)
    const legacyEnglishDir = path.join(siteConfig.outDir, 'en')
    await mkdir(legacyEnglishDir, { recursive: true })
    await writeFile(path.join(legacyEnglishDir, 'index.html'), LEGACY_ENGLISH_REDIRECT_HTML)
    await writeFile(path.join(siteConfig.outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${DOCS_ORIGIN}/sitemap.xml\n`)
    await Promise.all([
      removeImageFiles(path.join(siteConfig.outDir, 'cms')),
      removeImageFiles(path.join(siteConfig.outDir, 'product')),
      ...(PUBLISH_PRODUCT_FEATURES
        ? []
        : [removeImageFiles(path.join(siteConfig.outDir, 'en', 'product'))]),
    ])
  },
  markdown: {
    config(md) {
      md.use(diagramPlugin, { preview: true })
      const defaultOpen = md.renderer.rules.link_open
      md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const hrefIndex = tokens[idx].attrIndex('href')
        if (hrefIndex >= 0) {
          tokens[idx].attrs[hrefIndex][1] = stripEnglishUrlPrefix(tokens[idx].attrs[hrefIndex][1])
        }
        return defaultOpen
          ? defaultOpen(tokens, idx, options, env, self)
          : self.renderToken(tokens, idx, options)
      }
    },
  },
  rewrites: {
    'en/:rest*': ':rest*',
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
    editLink: enEditLink,
    search: {
      provider: 'local'
    },
    outline: {
      level: 'deep'
    },
  },
  locales: {
    root: enLocale,
    ...(PUBLISH_ZH ? { zh: { ...zhLocale, link: '/zh/' } } : {}),
  },
})
