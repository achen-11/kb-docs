/**
 * Capture Kooboo console screenshots for docs/public/product/console/
 *
 * Usage:
 *   pnpm screenshots:product:console
 *   KOOBOO_SCREENSHOT_SCOPE=ai-config pnpm screenshots:product:console
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
const OUT_DIR = path.join(REPO_ROOT, 'docs', 'public', 'product', 'console')

const BASE = process.env.KOOBOO_BASE || 'https://www.redev.cn'
const USER = process.env.KOOBOO_USER || 'wg-gmail'
const PASS = process.env.KOOBOO_PASS || ''
const SCOPE = process.env.KOOBOO_SCREENSHOT_SCOPE || 'all'

if (!PASS) {
  console.error('Set KOOBOO_PASS in the environment or kb-docs/.env')
  process.exit(1)
}

const shots = []

async function login(page) {
  await page.goto(`${BASE}/_Admin/login`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.waitForTimeout(1500)

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
  await page.waitForTimeout(2000)
}

function consoleUrl(pathname = '') {
  return `${BASE}/_Admin/kconsole${pathname}`
}

async function waitForConsole(page) {
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
  await page.locator('.el-menu').first().waitFor({ timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1200)
}

async function gotoConsole(page, pathname = '') {
  await page.goto(consoleUrl(pathname), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await waitForConsole(page)
}

async function redactSensitive(page) {
  await page.evaluate(() => {
    const emailRe = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
    const domainRe = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi
    const currencyRe =
      /(?:US\$|\$|¥)\s*\d[\d,.]*|\d[\d,.]*\s*(?:USD|CNY|EUR|US\$)/gi

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
      text = text.replace(emailRe, 'user@example.com')
      text = text.replace(domainRe, 'example.com')
      text = text.replace(currencyRe, '***')
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

      if (hint.includes('apikey') || hint.includes('api key')) {
        input.value = 'sk-************'
      } else if (hint.includes('email') || emailRe.test(value)) {
        input.value = 'user@example.com'
      } else if ((hint.includes('domain') || hint.includes('url')) && domainRe.test(value)) {
        input.value = 'example.com'
      } else if (currencyRe.test(value)) {
        input.value = '***'
      }
    }

    const route = `${location.pathname}${location.search}`
    if (route.includes('/organization')) {
      for (const item of document.querySelectorAll('ul li')) {
        if (/当前组织|Current Organization/i.test(item.textContent || '')) {
          const value = item.querySelector('.text-blue')
          if (value) value.textContent = 'demo-org'
        }
      }

      document
        .querySelectorAll('.el-table__body-wrapper tbody tr')
        .forEach((row, index) => {
          const firstCell = row.querySelector('td:nth-child(1) .cell')
          if (firstCell) firstCell.textContent = `user-${String(index + 1).padStart(2, '0')}`
        })
    }

    if (route.includes('/departments')) {
      document
        .querySelectorAll('.el-table__body-wrapper tbody tr')
        .forEach((row, index) => {
          const firstCell = row.querySelector('td:nth-child(1) .cell')
          if (firstCell) {
            firstCell.textContent = `department-${String(index + 1).padStart(2, '0')}`
          }
        })
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

async function captureDomains(page) {
  await gotoConsole(page, '')
  await snap(page, 'console-overview.png')
  await snap(page, 'domains-overview.png')

  const firstDomain = page.locator('[data-cy="domain"]').first()
  if (await firstDomain.count()) {
    const domainName = (await firstDomain.innerText()).trim()
    await firstDomain.click()
    await waitForConsole(page)
    await snap(page, 'domains-binding.png')

    if (domainName) {
      await gotoConsole(page, `/domainDNS?domainName=${encodeURIComponent(domainName)}`)
      await snap(page, 'domains-dns.png')
    }
  }

  await gotoConsole(page, '/domainSearch')
  await snap(page, 'domains-search.png')
}

async function captureOrganization(page) {
  await gotoConsole(page, '/organization')
  await snap(page, 'organization-overview.png')

  await gotoConsole(page, '/departments')
  await snap(page, 'organization-departments.png')
}

async function captureDataCenters(page) {
  await gotoConsole(page, '/serviceDataCenter')
  await snap(page, 'data-centers-overview.png')
}

async function captureSearchConsole(page) {
  await gotoConsole(page, '/searchConsole')
  await snap(page, 'google-search-console-overview.png')
}

async function captureMembership(page) {
  await gotoConsole(page, '/member')
  await snap(page, 'membership-overview.png')
}

async function captureAiConfig(page) {
  await gotoConsole(page, '/consoleAIConfig')
  await page.locator('input[placeholder="ApiKey"]').first().waitFor({
    timeout: 30000,
  }).catch(() => {})
  await redactSensitive(page)
  await snap(page, 'ai-config-overview.png')
}

async function captureBalance(page) {
  await gotoConsole(page, '/balance')
  await snap(page, 'balance-overview.png')
}

async function captureOrders(page) {
  await gotoConsole(page, '/consoleOrder')
  await snap(page, 'orders-overview.png')
}

async function captureRenewals(page) {
  await gotoConsole(page, '/renew')
  await snap(page, 'renewals-overview.png')
}

const CAPTURES = [
  ['domains', captureDomains],
  ['organization', captureOrganization],
  ['data-centers', captureDataCenters],
  ['google-search-console', captureSearchConsole],
  ['membership', captureMembership],
  ['ai-config', captureAiConfig],
  ['balance', captureBalance],
  ['orders', captureOrders],
  ['renewals', captureRenewals],
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    extraHTTPHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
  })
  const page = await context.newPage()

  await login(page)

  for (const [name, capture] of CAPTURES) {
    if (SCOPE !== 'all' && SCOPE !== name) continue
    console.log('capture', name)
    await capture(page)
  }

  await browser.close()
  console.log('done:', shots.length, 'files')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
