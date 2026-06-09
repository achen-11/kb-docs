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

async function resolveSiteId(page) {
  if (SITE_ID) return SITE_ID
  const sites = await page.evaluate(async (url) => {
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) throw new Error(`Failed to load site list: ${response.status}`)
    return response.json()
  }, apiUrl('Site/list'))
  SITE_ID = sites?.[0]?.siteId || ''
  if (!SITE_ID) throw new Error('No site found. Set KOOBOO_SITE_ID explicitly.')
  return SITE_ID
}

async function waitForPageSettled(page) {
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
  await page.waitForTimeout(1600)
}

async function gotoAiChat(page, tab) {
  await page.goto(withSite('/ai-chat/overview', tab ? { tab } : {}), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await page.locator('.overview-mini-chat, .ai-mini-chat').first().waitFor({
    timeout: 30000,
  }).catch(() => {})
  await waitForPageSettled(page)
}

async function isOverviewDashboard(page) {
  return (await page.getByText(/任务总览|Task Overview/i).count()) > 0
}

async function clickOverviewMore(page, index) {
  const more = page.getByText(/^(更多|More)$/).nth(index)
  if (!(await more.count())) return false
  await more.click()
  await waitForPageSettled(page)
  return true
}

async function openAiChatPanel(page, tab, overviewMoreIndex) {
  await gotoAiChat(page, tab)
  if (await isOverviewDashboard(page)) {
    await clickOverviewMore(page, overviewMoreIndex)
  }
  await waitForPageSettled(page)
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
  await page.evaluate(() => {
    const emailRe = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
    const domainRe = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi
    const urlRe = /https?:\/\/[^\s<>"']+/gi
    const guidRe = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
    const secretRe = /\b[A-Za-z0-9_-]*(?:key|token|secret|pass)[-_A-Za-z0-9]*\b/gi

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
          secretRe.test(value))
      ) {
        nextValue = '********'
      } else if (value && (hint.includes('email') || emailRe.test(value))) {
        nextValue = 'user@example.com'
      } else if (value && (hint.includes('url') || urlRe.test(value))) {
        nextValue = 'https://example.com/path'
      } else if (value && domainRe.test(value)) {
        nextValue = value.replace(domainRe, 'example.com')
      }

      if ('value' in input) input.value = nextValue
      else input.textContent = nextValue
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

    for (const iframe of document.querySelectorAll('iframe')) {
      iframe.style.visibility = 'hidden'
    }

    for (const message of document.querySelectorAll('.el-message')) {
      message.remove()
    }
  })
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
  await openAiChatPanel(page, 'fix', 1)
  await snap(page, 'ai-chat', 'fixed-tasks.png')
}

async function captureFixedTaskDialog(page) {
  await openAiChatPanel(page, 'fix', 1)
  const addButton = page.locator('.el-button:visible').filter({ has: page.locator('.el-icon') }).first()
  if (await addButton.count()) {
    await addButton.click().catch(() => {})
    await page.locator('.ai-task-job-form-dialog').first().waitFor({
      timeout: 20000,
    }).catch(() => {})
    await page.waitForTimeout(1200)
  }
  await snap(page, 'ai-chat', 'fixed-task-dialog.png')
}

async function captureTaskList(page) {
  await openAiChatPanel(page, 'task', 2)
  await snap(page, 'ai-chat', 'task-list.png')
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

async function captureFloatingDrawer(page) {
  await gotoSitePages(page)
  await page.locator('.ai-floating-button').first().click()
  await page.locator('.ai-mini-chat-panel').first().waitFor({ timeout: 20000 })
  const drawerButton = page.locator('.chat-header .header-actions .header-btn').nth(3)
  if (await drawerButton.count()) {
    await drawerButton.click()
    await page.locator('.ai-mini-chat-panel.panel-drawer').first().waitFor({
      timeout: 20000,
    }).catch(() => {})
    await page.waitForTimeout(1000)
  }
  await snap(page, 'ai-floating-assistant', 'floating-drawer.png')
}

const CAPTURES = [
  ['ai-chat-overview', captureAiChatOverview],
  ['fixed-tasks', captureFixedTasks],
  ['fixed-task-dialog', captureFixedTaskDialog],
  ['task-list', captureTaskList],
  ['floating-button', captureFloatingButton],
  ['floating-panel', captureFloatingPanel],
  ['floating-drawer', captureFloatingDrawer],
]

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
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

  console.log('done:', shots.length, 'files')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
