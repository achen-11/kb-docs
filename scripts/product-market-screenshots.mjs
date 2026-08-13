/**
 * Capture Kooboo market screenshots for docs/public/product/market/
 *
 * Usage:
 *   pnpm screenshots:product:market
 *   KOOBOO_DOC_LOCALE=en pnpm screenshots:product:market
 *   KOOBOO_BASE=http://localhost KOOBOO_USER=... KOOBOO_PASS=... pnpm screenshots:product:market
 *   KOOBOO_SCREENSHOT_SCOPE=detail pnpm screenshots:product:market
 *   KOOBOO_MARKET_MOCK=1 pnpm screenshots:product:market
 *
 * Credentials: KOOBOO_PASS in env or kb-docs/.env (see load-env.mjs)
 */
import './load-env.mjs'
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT =
  process.env.KOOBOO_DOCS_ROOT ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const BASE = process.env.KOOBOO_BASE || 'https://www.redev.cn'
const USER = process.env.KOOBOO_USER || 'wg-gmail'
const PASS = process.env.KOOBOO_PASS || ''
const SCOPE = process.env.KOOBOO_SCREENSHOT_SCOPE || 'all'
const USE_MOCK = /^(1|true|yes)$/i.test(process.env.KOOBOO_MARKET_MOCK || '')
const DOC_LOCALE = normalizeLocale(process.env.KOOBOO_DOC_LOCALE || 'zh')
const OUT_DIR =
  DOC_LOCALE === 'en'
    ? path.join(REPO_ROOT, 'docs', 'public', 'en', 'product', 'market')
    : path.join(REPO_ROOT, 'docs', 'public', 'product', 'market')

const LOCALE_CONFIG = {
  zh: {
    appLocale: 'zh',
    browserLocale: 'zh-CN',
    acceptLanguage: 'zh-CN,zh;q=0.9',
  },
  en: {
    appLocale: 'en',
    browserLocale: 'en-US',
    acceptLanguage: 'en-US,en;q=0.9',
  },
}

if (!PASS) {
  console.error('Set KOOBOO_PASS in the environment or kb-docs/.env')
  process.exit(1)
}

const shots = []

const demoTemplate = {
  id: 'demo-template-001',
  userName: 'Kooboo Team',
  thumbNail: '',
  name: '企业官网模板',
  category: 'Business',
  sizeString: '8.4 MB',
  description: '适合企业官网、产品介绍和内容发布的演示模板。',
  score: 2824,
  tags: 'business,website',
  lastModified: '2026-06-09T09:30:00Z',
  downloadCount: 128,
  pageCount: 12,
  contentCount: 8,
  imageCount: 24,
  layoutCount: 2,
  menuCount: 2,
  viewCount: 6,
  price: 0,
  thunbnailUrl: `${BASE}/mock-assets/template-cover.svg?asset=cover`,
  thumbNailFileName: 'template-cover.svg',
  previewUrl: 'https://example.com/template-preview',
  downloadUrl: '',
  theme: { name: 'Blue', value: 1 },
  thumbnailMime: 'image/svg+xml',
  type: { name: 'Site', value: 2 },
  screenShotUrl: `${BASE}/mock-assets/template-screenshot.svg?asset=screenshot`,
}

const demoPagedTemplates = {
  facets: [
    {
      name: 'category',
      labels: [
        { name: 'Business', count: 6 },
        { name: 'Marketing', count: 4 },
        { name: 'Blog', count: 3 },
      ],
    },
    {
      name: 'color',
      labels: [
        { name: 'White', count: 7 },
        { name: '#2296F3', count: 5 },
        { name: '#22C55E', count: 3 },
      ],
    },
  ],
  list: [
    demoTemplate,
    {
      ...demoTemplate,
      id: 'demo-template-002',
      name: '产品展示模板',
      downloadCount: 86,
      thunbnailUrl: `${BASE}/mock-assets/template-cover-alt.svg?asset=cover`,
    },
    {
      ...demoTemplate,
      id: 'demo-template-003',
      name: '内容门户模板',
      downloadCount: 64,
      thunbnailUrl: `${BASE}/mock-assets/template-cover-third.svg?asset=cover`,
    },
  ],
  pageNr: 1,
  pageSize: 12,
  totalCount: 3,
  totalPages: 1,
}

function normalizeLocale(locale) {
  return String(locale).toLowerCase().startsWith('en') ? 'en' : 'zh'
}

function apiUrl(pathname) {
  return new URL(`/_api/v2/${pathname.replace(/^\/+/, '')}`, BASE).toString()
}

function adminUrl(pathname = '') {
  return `${BASE}/_Admin${pathname}`
}

function jsonResponse(data) {
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
    },
    body: JSON.stringify(data),
  }
}

function svgResponse(title, accent = '#2296F3') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#f8fafc"/>
      <stop offset="1" stop-color="#e2e8f0"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect x="88" y="72" width="1104" height="92" rx="16" fill="#ffffff"/>
  <circle cx="132" cy="118" r="18" fill="${accent}"/>
  <rect x="176" y="104" width="260" height="28" rx="8" fill="#0f172a" opacity=".84"/>
  <rect x="88" y="204" width="320" height="404" rx="18" fill="#ffffff"/>
  <rect x="448" y="204" width="744" height="404" rx="18" fill="#ffffff"/>
  <rect x="128" y="248" width="220" height="24" rx="8" fill="#94a3b8"/>
  <rect x="128" y="296" width="180" height="18" rx="6" fill="#cbd5e1"/>
  <rect x="128" y="340" width="220" height="18" rx="6" fill="#cbd5e1"/>
  <rect x="488" y="250" width="320" height="32" rx="8" fill="#0f172a" opacity=".78"/>
  <rect x="488" y="312" width="560" height="20" rx="8" fill="#94a3b8"/>
  <rect x="488" y="356" width="480" height="20" rx="8" fill="#cbd5e1"/>
  <rect x="488" y="432" width="156" height="48" rx="24" fill="${accent}"/>
  <text x="88" y="676" fill="#334155" font-family="Arial, sans-serif" font-size="34" font-weight="700">${title}</text>
</svg>`
  return {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml;charset=utf-8' },
    body: svg,
  }
}

async function setupMarketMocks(page) {
  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname.toLowerCase()

    if (pathname.endsWith('/mock-assets/template-cover.svg')) {
      await route.fulfill(svgResponse('企业官网模板', '#2296F3'))
      return
    }
    if (pathname.endsWith('/mock-assets/template-cover-alt.svg')) {
      await route.fulfill(svgResponse('产品展示模板', '#16A34A'))
      return
    }
    if (pathname.endsWith('/mock-assets/template-cover-third.svg')) {
      await route.fulfill(svgResponse('内容门户模板', '#7C3AED'))
      return
    }
    if (pathname.endsWith('/mock-assets/template-screenshot.svg')) {
      await route.fulfill(svgResponse('模板详情预览', '#2296F3'))
      return
    }

    if (pathname.endsWith('/template/type')) {
      await route.fulfill(
        jsonResponse([
          { key: '', value: '全部' },
          { key: 'Site', value: '站点' },
          { key: 'Module', value: '模块' },
        ])
      )
      return
    }
    if (pathname.endsWith('/template/fulltextsearch') || pathname.endsWith('/template/list')) {
      await route.fulfill(jsonResponse(demoPagedTemplates))
      return
    }
    if (pathname.endsWith('/template/detail')) {
      await route.fulfill(jsonResponse(demoTemplate))
      return
    }
    if (pathname.endsWith('/template/personal')) {
      await route.fulfill(jsonResponse([]))
      return
    }
    if (pathname.endsWith('/template/getedit')) {
      await route.fulfill(
        jsonResponse({
          id: demoTemplate.id,
          name: demoTemplate.name,
          price: 0,
          currency: 'CNY',
          isPublic: true,
          thumbnailUrl: demoTemplate.thunbnailUrl,
          screenShotUrl: demoTemplate.screenShotUrl,
        })
      )
      return
    }
    if (pathname.endsWith('/site/list')) {
      await route.fulfill(
        jsonResponse([
          {
            siteId: '00000000-0000-0000-0000-000000000001',
            siteDisplayName: '演示站点',
            homePageLink: 'https://example.com',
            iFramePreviewUrl: 'https://example.com',
            online: true,
            imageCount: 12,
            pageCount: 8,
            visitors: 0,
          },
        ])
      )
      return
    }
    if (pathname.endsWith('/domain/available')) {
      await route.fulfill(
        jsonResponse([
          {
            id: 'domain-demo',
            domainName: 'example.com',
            organizationId: 'org-demo',
            expirationDate: '2027-06-09T00:00:00Z',
            isKooboo: true,
            sudDomainUseDash: false,
          },
        ])
      )
      return
    }
    if (pathname.endsWith('/aiconversation/list')) {
      await route.fulfill(jsonResponse([]))
      return
    }
    if (pathname.endsWith('/aiconversation/create')) {
      await route.fulfill(
        jsonResponse({
          id: 'demo-ai-conversation',
          title: 'Demo',
          messages: [],
        })
      )
      return
    }

    await route.continue()
  })
}

async function login(page) {
  await page.goto(adminUrl('/login'), {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.waitForTimeout(1200)

  const userInput = page.locator('input:visible').first()
  const passInput = page.locator('input[type="password"]:visible').first()

  await userInput.fill(USER)
  await passInput.fill(PASS)

  const loginBtn = page.getByRole('button', { name: /登录|login/i }).first()
  if (await loginBtn.count()) await loginBtn.click()
  else await page.locator('button').filter({ hasText: /登录/ }).first().click()

  await page.waitForURL(/\/_Admin\/(?!login)/, { timeout: 60000 })
  await page.waitForTimeout(1800)

  const hasJwt = (await page.context().cookies(BASE)).some(
    (cookie) => cookie.name === 'jwt_token'
  )
  if (!hasJwt) {
    throw new Error('Login did not create jwt_token cookie')
  }
}

async function fetchHeader(page) {
  return page.evaluate(async (url) => {
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) throw new Error(`Failed to load CMS header: ${response.status}`)
    return response.json()
  }, apiUrl('bar/header'))
}

async function changeUserLanguage(page, language) {
  await page.evaluate(
    async ({ url, language: nextLanguage }) => {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify({ language: nextLanguage }),
      })
      if (!response.ok) throw new Error(`Failed to change language: ${response.status}`)
    },
    {
      url: apiUrl('user/ChangeLanguage'),
      language,
    }
  )
}

async function setLangCookie(context, language) {
  await context.addCookies([
    {
      name: '_cms_lang',
      value: language,
      url: BASE,
    },
  ])
}

async function applyUiLanguage(page, context) {
  const language = LOCALE_CONFIG[DOC_LOCALE].appLocale
  const previousLanguage = (await fetchHeader(page))?.user?.language || null

  await setLangCookie(context, language)
  if (previousLanguage !== language) {
    await changeUserLanguage(page, language)
  }

  return previousLanguage
}

async function restoreUiLanguage(page, context, previousLanguage) {
  if (!previousLanguage) return
  await setLangCookie(context, previousLanguage)
  const currentLanguage = (await fetchHeader(page))?.user?.language || null
  if (currentLanguage !== previousLanguage) {
    await changeUserLanguage(page, previousLanguage)
  }
}

async function waitForMarket(page) {
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
  await page.waitForTimeout(1400)
}

async function waitForIdleUi(page) {
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
  await page
    .locator('.el-loading-mask:visible')
    .first()
    .waitFor({ state: 'hidden', timeout: 30000 })
    .catch(() => {})
  await page.waitForTimeout(1000)
}

async function openAdminHome(page) {
  await page.goto(adminUrl('/'), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await waitForMarket(page)
}

async function openMarketList(page) {
  if (!USE_MOCK) {
    await page.goto(adminUrl('/templates'), {
      waitUntil: 'networkidle',
      timeout: 90000,
    })
    await waitForMarket(page)
    return
  }

  await openAdminHome(page)
  const marketIcon = page.locator('.icon-header-market').first()
  if (!(await marketIcon.count())) {
    throw new Error('Market icon not found in header')
  }
  await marketIcon.click()
  await page.waitForURL(/\/_Admin\/templates/, { timeout: 60000 }).catch(() => {})
  await waitForMarket(page)
}

async function openMyShared(page) {
  await openMarketList(page)
  const mySharedButton = page.getByRole('button', { name: /我分享的|My Shared/i }).first()
  if (!(await mySharedButton.count())) {
    throw new Error('My Shared button not found')
  }
  await mySharedButton.click()
  await page.waitForURL(/\/_Admin\/template\/my-shared/, { timeout: 60000 }).catch(() => {})
  await waitForMarket(page)
}

async function redactSensitive(page) {
  await page.evaluate(() => {
    const emailRe = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
    const domainRe = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi
    const urlRe = /https?:\/\/[^\s<>"']+/gi
    const guidRe = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi

    const shouldSkip = (node) => {
      const parent = node.parentElement
      if (!parent) return true
      const tag = parent.tagName
      return tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT'
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const textNodes = []
    while (walker.nextNode()) textNodes.push(walker.currentNode)

    for (const node of textNodes) {
      if (shouldSkip(node)) continue
      let text = node.nodeValue || ''
      text = text.replace(urlRe, 'https://example.com/path')
      text = text.replace(emailRe, 'user@example.com')
      text = text.replace(guidRe, '00000000-0000-0000-0000-000000000000')
      if (!/Kooboo/i.test(text)) {
        text = text.replace(domainRe, 'example.com')
      }
      node.nodeValue = text
    }

    for (const input of document.querySelectorAll('input, textarea')) {
      const hint = [
        input.getAttribute('placeholder'),
        input.getAttribute('name'),
        input.getAttribute('id'),
        input.getAttribute('aria-label'),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const value = input.value || ''

      if (value && (hint.includes('email') || emailRe.test(value))) {
        input.value = 'user@example.com'
      } else if (value && (hint.includes('url') || urlRe.test(value))) {
        input.value = 'https://example.com/path'
      } else if (value && domainRe.test(value)) {
        input.value = value.replace(domainRe, 'example.com')
      }
    }

    document.querySelectorAll('.el-select-dropdown__item').forEach((item, index) => {
      const text = item.textContent || ''
      if (emailRe.test(text) || domainRe.test(text) || guidRe.test(text)) {
        item.textContent = `示例选项 ${index + 1}`
      }
    })

    for (const message of document.querySelectorAll('.el-message')) {
      message.remove()
    }
  })
}

async function snap(page, name, options = {}) {
  await redactSensitive(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
  const file = path.join(OUT_DIR, name)
  await page.screenshot({
    path: file,
    fullPage: options.fullPage ?? false,
  })
  shots.push(file)
  console.log('saved', file)
}

async function captureOverview(page) {
  await openMarketList(page)
  await page.locator('[data-cy="template"], [data-cy="no-matching-template"]').first().waitFor({
    timeout: 30000,
  }).catch(() => {})
  await snap(page, 'templates-overview.png')
}

async function captureDetail(page) {
  await openMarketList(page)
  const template = page.locator('[data-cy="template"]').first()
  if (!(await template.count())) {
    await snap(page, 'template-detail.png')
    return
  }

  await template.click()
  await page.waitForURL(/\/_Admin\/template\/detail/, { timeout: 60000 }).catch(() => {})
  await waitForMarket(page)
  await page.locator('[data-cy="siteName"]').first().fill('demo').catch(() => {})
  await page.locator('[data-cy="subdomain"]').first().fill('demo').catch(() => {})
  await snap(page, 'template-detail.png')
}

async function captureMyShared(page) {
  await openMyShared(page)
  await page.locator('text=/我分享的|My Shared/i').first().waitFor({ timeout: 30000 }).catch(() => {})
  await snap(page, 'my-shared.png')
}

async function captureShareDialog(page) {
  await openMyShared(page)
  const shareButton = page.locator('button:visible').filter({ hasText: /分享|Share/i }).first()
  if (await shareButton.count()) {
    await shareButton.click({ timeout: 8000 })
    await page.locator('.el-dialog:visible').first().waitFor({ timeout: 30000 })
    await waitForIdleUi(page)
  }
  await snap(page, 'share-template-dialog.png')
}

async function captureEditDialog(page) {
  await openMyShared(page)
  const editButton = page.getByRole('button', { name: /^编辑$|^Edit$/i }).first()
  if (await editButton.count()) {
    await editButton.click()
    await page.locator('.el-dialog').first().waitFor({ timeout: 30000 }).catch(() => {})
    await snap(page, 'edit-template-dialog.png')
    return
  }

  console.log('skip edit-template-dialog.png: no shared template found')
}

const CAPTURES = [
  ['overview', captureOverview],
  ['detail', captureDetail],
  ['my-shared', captureMyShared],
  ['share-dialog', captureShareDialog],
  ['edit-dialog', captureEditDialog],
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: LOCALE_CONFIG[DOC_LOCALE].browserLocale,
    extraHTTPHeaders: {
      'Accept-Language': LOCALE_CONFIG[DOC_LOCALE].acceptLanguage,
    },
  })
  const page = await context.newPage()
  if (USE_MOCK) await setupMarketMocks(page)

  await login(page)
  const previousLanguage = await applyUiLanguage(page, context)

  try {
    for (const [name, capture] of CAPTURES) {
      if (SCOPE !== 'all' && SCOPE !== name) continue
      console.log('capture', name)
      await capture(page)
    }
  } finally {
    await restoreUiLanguage(page, context, previousLanguage)
    await browser.close()
  }

  console.log('done:', shots.length, 'files')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
