/**
 * Capture Kooboo AI product screenshots for docs/public/product/ai-chat/
 * and docs/public/product/ai-floating-assistant/
 *
 * Usage:
 *   pnpm screenshots:product:ai
 *   KOOBOO_SCREENSHOT_SCOPE=floating-panel pnpm screenshots:product:ai
 *   KOOBOO_BASE=http://localhost KOOBOO_SITE_ID=... KOOBOO_USER=... KOOBOO_PASS=... pnpm screenshots:product:ai
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

const BASE = process.env.KOOBOO_BASE || 'http://localhost'
const USER = process.env.KOOBOO_USER || 'zguoqi2'
const PASS = process.env.KOOBOO_PASS || ''
let SITE_ID = process.env.KOOBOO_SITE_ID || ''
const SCOPE = process.env.KOOBOO_SCREENSHOT_SCOPE || 'all'
const DOC_LOCALE = normalizeLocale(process.env.KOOBOO_DOC_LOCALE || 'zh')

const OUT_ROOT =
  DOC_LOCALE === 'en'
    ? path.join(REPO_ROOT, 'docs', 'public', 'en', 'product')
    : path.join(REPO_ROOT, 'docs', 'public', 'product')

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

function normalizeLocale(locale) {
  return String(locale).toLowerCase().startsWith('en') ? 'en' : 'zh'
}

function apiUrl(pathname) {
  return new URL(`/_api/v2/${pathname.replace(/^\/+/, '')}`, BASE).toString()
}

function adminUrl(pathname = '') {
  return `${BASE}/_Admin${pathname}`
}

function withSite(pathname, extraQuery = {}) {
  const url = new URL(adminUrl(pathname))
  url.searchParams.set('SiteId', SITE_ID)
  for (const [key, value] of Object.entries(extraQuery)) {
    if (value) url.searchParams.set(key, value)
  }
  return url.toString()
}

async function login(page) {
  await page.goto(adminUrl('/login'), {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.waitForTimeout(1200)

  const userInput = page
    .locator('input:visible')
    .filter({ hasNot: page.locator('[type="password"]') })
    .first()
  const passInput = page.locator('input[type="password"]:visible').first()

  await userInput.fill(USER)
  await passInput.fill(PASS)

  const loginBtn = page.getByRole('button', { name: /登录|login/i }).first()
  if (await loginBtn.count()) await loginBtn.click()
  else await page.locator('button').filter({ hasText: /登录/ }).first().click()

  await page.waitForURL(/\/_Admin\/(?!login)/, { timeout: 60000 })
  await page.waitForTimeout(1800)

  if (/\/_Admin\/login(?:[/?#]|$)/i.test(page.url())) {
    throw new Error(`Login remained on the login page: ${page.url()}`)
  }

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

async function resolveSiteId(page) {
  if (SITE_ID) return SITE_ID
  const sites = await page.evaluate(async (url) => {
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) throw new Error(`Failed to load site list: ${response.status}`)
    return response.json()
  }, apiUrl('Site/list'))
  for (const site of sites || []) {
    const siteId = site?.siteId || site?.id || ''
    if (!siteId) continue
    const hasPages = await page.evaluate(
      async ({ url, siteId: candidateSiteId }) => {
        const endpoint = new URL(url)
        endpoint.searchParams.set('SiteId', candidateSiteId)
        const response = await fetch(endpoint, { credentials: 'include' })
        if (!response.ok) return false
        const result = await response.json()
        const list = Array.isArray(result) ? result : result?.list
        return Array.isArray(list) && list.length > 0
      },
      { url: apiUrl('Page/list'), siteId }
    )
    if (hasPages) {
      SITE_ID = siteId
      break
    }
  }
  SITE_ID ||= sites?.[0]?.siteId || sites?.[0]?.id || ''
  if (!SITE_ID) throw new Error('No site found. Set KOOBOO_SITE_ID explicitly.')
  return SITE_ID
}

async function waitForPageSettled(page) {
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
  await page.waitForTimeout(1600)
}

async function gotoAiChat(page, tab, submenu) {
  await page.goto(
    withSite('/ai-chat/overview', {
      ...(tab ? { tab } : {}),
      ...(submenu ? { submenu } : {}),
    }),
    {
      waitUntil: 'networkidle',
      timeout: 90000,
    }
  )
  try {
    const ready =
      tab === 'setting'
        ? page.getByRole('heading', { name: /AI Chat 设置|AI Chat Settings/i })
        : page.locator('.ai-chat-main-panel, .ai-chat-input').first()
    await ready.waitFor({ timeout: 30000 })
  } catch {
    throw new Error(
      `AI Chat shell did not load: url=${page.url()} title=${await page.title()}`
    )
  }
  await waitForPageSettled(page)

  if (!/\/_Admin\/ai-chat\/overview(?:[/?#]|$)/i.test(page.url())) {
    throw new Error(`AI Chat navigation left the expected route: ${page.url()}`)
  }
}

async function gotoSitePages(page) {
  await page.goto(withSite('/site/pages'), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await page.locator('.ai-floating-button').first().waitFor({
    timeout: 30000,
  }).catch(() => {})
  await waitForPageSettled(page)
}

async function redactSensitive(page) {
  await page.evaluate((docLocale) => {
    const emailRe = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
    const domainRe = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi
    const urlRe = /https?:\/\/[^\s<>"']+/gi
    const guidRe = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
    const secretRe = /\b[A-Za-z0-9_-]*(?:key|token|secret|pass)[-_A-Za-z0-9]*\b/gi
    const emailTestRe = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
    const domainTestRe = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/i
    const urlTestRe = /https?:\/\/[^\s<>"']+/i
    const secretTestRe = /\b[A-Za-z0-9_-]*(?:key|token|secret|pass)[-_A-Za-z0-9]*\b/i

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
      text = text.replace(secretRe, '********')
      if (!/Kooboo|AI|CMS|KScript|localhost|DOCTYPE/i.test(text)) {
        text = text.replace(domainRe, 'example.com')
      }
      node.nodeValue = text
    }

    if (docLocale === 'en') {
      const translations = new Map([
        ['你好！我是Kooboo自助智能体，有什么可以帮助你的吗？', "Hi! I'm Kooboo Self-Service Agent. How can I help?"],
        ['流量异常', 'Traffic anomaly'],
        ['最近24小时流量下降了20%', 'Traffic fell by 20% in the last 24 hours'],
        ['内容优化建议', 'Content optimization'],
        ['发现5篇文章可以优化SEO', '5 articles could improve their SEO'],
        ['同步订单数据', 'Sync order data'],
        ['生成网站报告', 'Generate site report'],
        ['向 AI 提问或要求更改任何内容...', 'Ask AI a question or request a change...'],
      ])

      for (const node of textNodes) {
        if (shouldSkip(node)) continue
        const text = (node.nodeValue || '').trim()
        if (!text || !/[\u3400-\u9fff]/u.test(text)) continue

        const translated = translations.get(text)
        if (translated) {
          node.nodeValue = (node.nodeValue || '').replace(text, translated)
          continue
        }

        const parent = node.parentElement
        const context = parent?.closest(
          '.message-bubble, .ai-chat-input, .task-item, .task-card, .task-log-message, [class*="task"]'
        )
        if (context) node.nodeValue = 'Demo task'
      }
    }

    for (const input of document.querySelectorAll('input, textarea, [contenteditable="true"]')) {
      const hint = [
        input.getAttribute('placeholder'),
        input.getAttribute('name'),
        input.getAttribute('id'),
        input.getAttribute('aria-label'),
        input.getAttribute('type'),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const value = input.value || input.textContent || ''

      let nextValue = value
      if (
        value &&
        (hint.includes('password') ||
          hint.includes('token') ||
          hint.includes('secret') ||
          hint.includes('key') ||
          secretTestRe.test(value))
      ) {
        nextValue = '********'
      } else if (value && (hint.includes('email') || emailTestRe.test(value))) {
        nextValue = 'user@example.com'
      } else if (value && (hint.includes('url') || urlTestRe.test(value))) {
        nextValue = 'https://example.com/path'
      } else if (value && domainTestRe.test(value)) {
        nextValue = value.replace(domainRe, 'example.com')
      }

      if ('value' in input) input.value = nextValue
      else input.textContent = nextValue

      if (docLocale === 'en') {
        const placeholder = input.getAttribute('placeholder') || ''
        if (/[\u3400-\u9fff]/u.test(placeholder)) {
          input.setAttribute('placeholder', 'Ask AI a question or request a change...')
        }
      }
    }

    document
      .querySelectorAll('.history-item-title-text')
      .forEach((node, index) => {
        node.textContent = `演示会话 ${index + 1}`
      })

    document
      .querySelectorAll('.task-log-message')
      .forEach((node) => {
        node.textContent = '任务执行摘要'
      })

    document
      .querySelectorAll('.message-bubble')
      .forEach((node) => {
        const text = node.textContent || ''
        if (/token|key|secret|password|@|https?:\/\//i.test(text)) {
          node.textContent = '已打码的对话内容'
        }
      })

    for (const message of document.querySelectorAll('.el-message')) {
      message.remove()
    }
  }, DOC_LOCALE)
}

async function snap(page, folder, name, options = {}) {
  await redactSensitive(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
  const dir = path.join(OUT_ROOT, folder)
  await mkdir(dir, { recursive: true })
  const file = path.join(dir, name)
  await page.screenshot({
    path: file,
    fullPage: options.fullPage ?? false,
  })
  shots.push(file)
  console.log('saved', file)
}

async function captureAiChatOverview(page) {
  await gotoAiChat(page)
  await snap(page, 'ai-chat', 'ai-chat-overview.png')
}

async function captureFixedTasks(page) {
  await gotoAiChat(page, 'fix')
  await snap(page, 'ai-chat', 'fixed-tasks.png')
}

async function captureFixedTaskDialog(page) {
  await gotoAiChat(page, 'fix')
  const plus = page.locator('button.el-button--small').filter({
    has: page.locator('.el-icon'),
  }).first()
  if (await plus.count()) {
    await plus.click()
    const dialog = page.locator('.el-dialog:visible, .ai-task-job-form-dialog:visible').first()
    await dialog.waitFor({ timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(1000)
    if (await dialog.count()) {
      await redactSensitive(page)
      const dir = path.join(OUT_ROOT, 'ai-chat')
      await mkdir(dir, { recursive: true })
      const file = path.join(dir, 'fixed-task-dialog.png')
      await dialog.screenshot({ path: file })
      shots.push(file)
      console.log('saved', file)
      return
    }
  }
  await snap(page, 'ai-chat', 'fixed-task-dialog.png')
}

async function captureTaskList(page) {
  await gotoAiChat(page, 'task')
  await snap(page, 'ai-chat', 'task-list.png')
}

async function captureDataContent(page) {
  await gotoAiChat(page, 'data', 'content-model')
  await snap(page, 'ai-chat', 'data-content.png')
}

async function captureDesign(page) {
  await gotoAiChat(page, 'design')
  await snap(page, 'ai-chat', 'design.png')
}

async function captureSettings(page) {
  await gotoAiChat(page, 'setting')
  await snap(page, 'ai-chat', 'settings.png')
}

async function captureWorkspaceCode(page) {
  await gotoAiChat(page)
  const newChat = page.locator('.icon-new-chat:visible').first()
  if (await newChat.count()) {
    await newChat.click()
    await page.waitForTimeout(800)
  }
  const expandWorkspace = page.getByRole('button', {
    name: /expand workspace/i,
  })
  if (await expandWorkspace.count()) {
    await expandWorkspace.click()
    await page.waitForTimeout(800)
  }
  const codeTab = page.getByRole('tab', { name: /^code$/i }).first()
  await codeTab.waitFor({ state: 'visible', timeout: 20000 })
  await codeTab.click()
  await page
    .locator('.workspace-mode-tabs__tab[aria-selected="true"]')
    .filter({ has: page.locator('.icon-code') })
    .first()
    .waitFor({ state: 'visible', timeout: 10000 })
  await page.locator('.ai-chat-right-sidebar__code-preview:visible').waitFor({
    state: 'visible',
    timeout: 20000,
  })
  await page.waitForTimeout(1500)
  await snap(page, 'ai-chat', 'workspace-code.png')
}

async function captureFloatingButton(page) {
  await gotoSitePages(page)
  await snap(page, 'ai-floating-assistant', 'floating-button.png')
}

async function captureFloatingPanel(page) {
  await gotoSitePages(page)
  await page.locator('.ai-floating-button').first().click()
  await page.locator('.ai-mini-chat-panel').first().waitFor({ timeout: 20000 })
  await page.waitForTimeout(1000)
  await snap(page, 'ai-floating-assistant', 'floating-panel.png')
}

const CAPTURES = [
  ['ai-chat-overview', captureAiChatOverview],
  ['fixed-tasks', captureFixedTasks],
  ['fixed-task-dialog', captureFixedTaskDialog],
  ['task-list', captureTaskList],
  ['data-content', captureDataContent],
  ['design', captureDesign],
  ['settings', captureSettings],
  ['workspace-code', captureWorkspaceCode],
  ['floating-button', captureFloatingButton],
  ['floating-panel', captureFloatingPanel],
]

async function main() {
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

  await login(page)
  const previousLanguage = await applyUiLanguage(page, context)
  await resolveSiteId(page)

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

  if (shots.length === 0) {
    throw new Error(`No screenshots captured for scope: ${SCOPE}`)
  }
  console.log('done:', shots.length, 'files')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
