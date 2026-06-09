/**
 * Capture Kooboo mail screenshots for docs/public/product/mail/
 *
 * Usage:
 *   pnpm screenshots:product:mail
 *   KOOBOO_DOC_LOCALE=en pnpm screenshots:product:mail
 *   KOOBOO_BASE=http://localhost KOOBOO_USER=... KOOBOO_PASS=... pnpm screenshots:product:mail
 *   KOOBOO_SCREENSHOT_SCOPE=addresses pnpm screenshots:product:mail
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
const USER = process.env.KOOBOO_USER || 'wg-gmail'
const PASS = process.env.KOOBOO_PASS || ''
const SCOPE = process.env.KOOBOO_SCREENSHOT_SCOPE || 'all'
const DOC_LOCALE = normalizeLocale(process.env.KOOBOO_DOC_LOCALE || 'zh')
const OUT_DIR =
  DOC_LOCALE === 'en'
    ? path.join(REPO_ROOT, 'docs', 'public', 'en', 'product', 'mail')
    : path.join(REPO_ROOT, 'docs', 'public', 'product', 'mail')

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

async function login(page) {
  await page.goto(`${BASE}/_Admin/login`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.waitForTimeout(1200)

  const userInput = page
    .locator('input')
    .filter({ hasNot: page.locator('[type="password"]') })
    .first()
  const passInput = page.locator('input[type="password"]').first()

  await userInput.fill(USER)
  await passInput.fill(PASS)

  const loginBtn = page.getByRole('button', { name: /登录|login/i }).first()
  if (await loginBtn.count()) await loginBtn.click()
  else await page.locator('button').filter({ hasText: /登录/ }).first().click()

  await page.waitForURL(/\/_Admin\/(?!login)/, { timeout: 60000 })
  await page.waitForTimeout(1800)
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

function adminUrl(pathname = '') {
  return `${BASE}/_Admin${pathname}`
}

async function waitForMail(page) {
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
  await page.locator('.el-menu').first().waitFor({ timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1400)
}

async function gotoMail(page, pathname) {
  await page.goto(adminUrl(pathname), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await waitForMail(page)
}

async function redactSensitive(page) {
  await page.evaluate(() => {
    const emailRe = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
    const domainRe = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi
    const longSecretRe = /\b(?:sk|pk|key|token|secret|pass)[-_A-Za-z0-9]{10,}\b/gi
    const urlRe = /https?:\/\/[^\s<>"']+/gi

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
      text = text.replace(longSecretRe, '********')
      if (!/Kooboo|IMAP|SMTP|DMARC|BIMI|VMC/i.test(text)) {
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
        input.getAttribute('type'),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const value = input.value || ''

      if (
        value &&
        (hint.includes('password') ||
          hint.includes('token') ||
          hint.includes('secret') ||
          hint.includes('key') ||
          longSecretRe.test(value))
      ) {
        input.value = '********'
      } else if (value && (hint.includes('email') || emailRe.test(value))) {
        input.value = 'user@example.com'
      } else if (value && (hint.includes('url') || urlRe.test(value))) {
        input.value = 'https://example.com/path'
      } else if (value && domainRe.test(value)) {
        input.value = value.replace(domainRe, 'example.com')
      }
    }

    document
      .querySelectorAll('[data-cy="to-or-from"], [data-cy="from"], [data-cy="to"], [data-cy="cc"], [data-cy="bcc"]')
      .forEach((item, index) => {
        item.textContent = index % 2 === 0 ? 'Example User' : 'user@example.com'
      })

    document.querySelectorAll('[data-cy="subject"]').forEach((item, index) => {
      item.textContent = `示例邮件主题 ${index + 1}`
    })

    document.querySelectorAll('[data-cy="date"]').forEach((item) => {
      item.textContent = '2026-06-09 09:30'
    })

    document
      .querySelectorAll('.el-table__body-wrapper tbody tr')
      .forEach((row, index) => {
        const cells = row.querySelectorAll('.cell')
        cells.forEach((cell) => {
          const text = cell.textContent || ''
          if (emailRe.test(text)) cell.textContent = `user-${index + 1}@example.com`
          else if (urlRe.test(text)) cell.textContent = 'https://example.com/path'
          else if (domainRe.test(text) && !/Kooboo|DMARC|BIMI|VMC/i.test(text)) {
            cell.textContent = 'example.com'
          }
        })
      })

    for (const iframe of document.querySelectorAll('iframe')) {
      iframe.style.visibility = 'hidden'
    }

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

async function captureInbox(page) {
  await gotoMail(page, '/kmail/inbox')
  await snap(page, 'mail-overview.png')

  const firstCheckbox = page.locator('[data-cy="checkbox"]').first()
  if (await firstCheckbox.count()) {
    await firstCheckbox.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(300)
  }
  await snap(page, 'messages-overview.png')
}

async function captureCalendar(page) {
  await gotoMail(page, '/kmail/calendar')
  await snap(page, 'calendar-overview.png')
}

async function captureCompose(page) {
  await gotoMail(page, '/kmail/compose?type=compose')
  await page.locator('[data-cy="send"]').first().waitFor({ timeout: 30000 }).catch(() => {})
  await snap(page, 'compose-editor.png')
}

async function captureAddresses(page) {
  await gotoMail(page, '/kmail-settings/addresses')
  await snap(page, 'addresses-overview.png')
}

async function captureContacts(page) {
  await gotoMail(page, '/kmail-settings/contacts')
  await snap(page, 'contacts-overview.png')
}

async function captureSecurityReport(page) {
  await gotoMail(page, '/kmail-settings/security-report')
  await snap(page, 'security-report-overview.png')
}

async function captureImap(page) {
  await gotoMail(page, '/kmail-settings/imap-setting')
  await snap(page, 'imap-settings.png')
}

async function captureModules(page) {
  await gotoMail(page, '/kmail-settings/mail-module')
  await snap(page, 'mail-modules-overview.png')

  const moduleLink = page.locator('a[data-cy="name"]').first()
  if (await moduleLink.count()) {
    await moduleLink.click()
    await waitForMail(page)
    await snap(page, 'mail-module-editor.png')
  } else {
    await gotoMail(page, '/mail-module-editor?id=00000000-0000-0000-0000-000000000000')
    await snap(page, 'mail-module-editor.png')
  }
}

async function captureInboxLogo(page) {
  await gotoMail(page, '/kmail-settings/inbox-logo')
  await snap(page, 'inbox-logo-overview.png')
}

async function captureSmtp(page) {
  await gotoMail(page, '/kmail-settings/smtp-setting')
  await snap(page, 'smtp-settings.png')
}

const CAPTURES = [
  ['inbox', captureInbox],
  ['calendar', captureCalendar],
  ['compose', captureCompose],
  ['addresses', captureAddresses],
  ['contacts', captureContacts],
  ['security-report', captureSecurityReport],
  ['imap', captureImap],
  ['modules', captureModules],
  ['inbox-logo', captureInboxLogo],
  ['smtp', captureSmtp],
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
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
