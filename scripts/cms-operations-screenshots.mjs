/**
 * Capture Kooboo admin CMS screenshots for docs/public/cms/operations/
 * Usage: KOOBOO_SCREENSHOT_SCOPE=visitor-logs node scripts/cms-operations-screenshots.mjs
 */
import './load-env.mjs'
import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const REPO_ROOT =
  process.env.KOOBOO_DOCS_ROOT ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(REPO_ROOT, 'docs/public/cms/operations')

const BASE = process.env.KOOBOO_BASE || 'https://www.redev.cn'
const SITE_ID =
  process.env.KOOBOO_SITE_ID || '552e81ab-eb2a-cb82-1458-aa61512cedd2'
const USER = process.env.KOOBOO_USER || 'wg-gmail'
const PASS = process.env.KOOBOO_PASS || ''

if (!PASS) {
  console.error('Set KOOBOO_PASS in the environment or kb-docs/.env')
  process.exit(1)
}

async function login(page) {
  await page.goto(`${BASE}/_Admin/login`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.waitForTimeout(1500)
  await page.locator('input[type="password"]').first().fill(PASS)
  await page
    .locator('input')
    .filter({ hasNot: page.locator('[type="password"]') })
    .first()
    .fill(USER)
  const loginBtn = page.getByRole('button', { name: /登录|login/i }).first()
  if (await loginBtn.count()) await loginBtn.click()
  else await page.locator('button').filter({ hasText: /登录/ }).first().click()
  await page.waitForURL(/\/_Admin\/(?!login)/, { timeout: 60000 })
  await page.waitForTimeout(2000)
}

async function snap(page, name, options = {}) {
  const { fullPage = false } = options
  const file = path.join(OUT_DIR, name)
  await page.screenshot({ path: file, fullPage })
  console.log('saved', file)
}

async function snapLocator(locator, name) {
  await locator.scrollIntoViewIfNeeded()
  await locator.page().waitForTimeout(500)
  const file = path.join(OUT_DIR, name)
  await locator.screenshot({ path: file })
  console.log('saved', file)
}

async function waitVisitorLogsReady(page) {
  await page
    .waitForResponse(
      (r) => r.url().includes('VisitorLog') && r.status() === 200,
      { timeout: 90000 }
    )
    .catch(() => {})
  await page
    .waitForSelector('.el-card', { state: 'visible', timeout: 30000 })
    .catch(() => {})
  await page.waitForTimeout(1500)
}

function mainContent(page) {
  return page.locator('.px-24.pb-24.space-y-24').first()
}

async function snapMainBlocks(page) {
  const content = mainContent(page)
  await content.waitFor({ state: 'visible', timeout: 30000 })
  const blocks = content.locator(':scope > *')
  const count = await blocks.count()
  const names = [
    'visitor-logs-summary-cards.png',
    'visitor-logs-trend-ranking.png',
    'visitor-logs-bot-intelligence.png',
    'visitor-logs-pixel-viewport.png',
    'visitor-logs-color-traffic-source.png',
    'visitor-logs-popular-countries.png',
    'visitor-logs-ect-browser.png',
    'visitor-logs-latest-visitors.png',
  ]
  for (let i = 0; i < Math.min(count, names.length); i++) {
    await snapLocator(blocks.nth(i), names[i])
  }
}

async function readDateRange(page) {
  const inputs = page.locator('.el-date-editor--daterange input')
  if ((await inputs.count()) >= 2) {
    const startDate = await inputs.nth(0).inputValue()
    const endDate = await inputs.nth(1).inputValue()
    if (startDate && endDate) return { startDate, endDate }
  }
  return {}
}

function panelUrl(slug, startDate, endDate) {
  const q = new URLSearchParams({ SiteId: SITE_ID })
  if (startDate && endDate) {
    q.set('startDate', startDate)
    q.set('endDate', endDate)
  }
  return `${BASE}/_Admin/system/visitor-logs/${slug}?${q}`
}

async function snapSubPanel(page, slug, filename, dateRange) {
  const { startDate, endDate } = dateRange
  await page.goto(panelUrl(slug, startDate, endDate), {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  await page
    .waitForResponse(
      (r) => r.url().includes('VisitorLog') && r.status() === 200,
      { timeout: 45000 }
    )
    .catch(() => {})
  await page
    .locator('.el-table, .bot-intelligence-banner, .el-skeleton')
    .first()
    .waitFor({ state: 'visible', timeout: 20000 })
    .catch(() => {})
  await page.waitForTimeout(1200)

  const header = page.locator('.relative.p-24.flex.items-center').first()
  const body = page.locator('.px-\\[24px\\]').first()
  if ((await header.count()) && (await body.count())) {
    const box = await header.boundingBox()
    const bodyBox = await body.boundingBox()
    if (box && bodyBox) {
      const file = path.join(OUT_DIR, filename)
      await page.screenshot({
        path: file,
        clip: {
          x: Math.min(box.x, bodyBox.x),
          y: box.y,
          width:
            Math.max(box.x + box.width, bodyBox.x + bodyBox.width) -
            Math.min(box.x, bodyBox.x),
          height: bodyBox.y + bodyBox.height - box.y,
        },
      })
      console.log('saved', file)
      return
    }
  }
  if (await body.count()) await snapLocator(body, filename)
  else if (await header.count()) await snapLocator(header, filename)
}

async function captureVisitorLogs(page) {
  const overviewUrl = `${BASE}/_Admin/system/visitor-logs?SiteId=${SITE_ID}`
  await page.goto(overviewUrl, { waitUntil: 'networkidle', timeout: 90000 })
  await waitVisitorLogsReady(page)
  await page.evaluate(() => window.scrollTo(0, 0))

  const header = page.locator('.relative.p-24.flex.items-center').first()
  await snapLocator(header, 'visitor-logs-header.png')
  await page.evaluate(() => window.scrollTo(0, 0))
  await snap(page, 'visitor-logs-overview.png', { fullPage: true })
  await snapMainBlocks(page)

  const dateRange = await readDateRange(page)
  const panels = [
    ['all-panel', 'visitor-logs-all-panel.png'],
    ['bot-panel', 'visitor-logs-bot-panel.png'],
    ['top-pages-panel', 'visitor-logs-top-pages-panel.png'],
    ['top-referer-panel', 'visitor-logs-top-referer-panel.png'],
    ['top-image-panel', 'visitor-logs-top-image-panel.png'],
    ['top-countries-panel', 'visitor-logs-top-countries-panel.png'],
    ['top-browsers-panel', 'visitor-logs-top-browsers-panel.png'],
  ]
  for (const [slug, file] of panels) {
    await snapSubPanel(page, slug, file, dateRange)
  }
}

async function main() {
  const only = process.env.KOOBOO_SCREENSHOT_SCOPE
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  await login(page)

  if (!only || only === 'visitor-logs') {
    await captureVisitorLogs(page)
  }

  await browser.close()
  console.log('done →', OUT_DIR)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
