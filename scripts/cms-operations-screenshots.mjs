/**
 * Capture Kooboo admin CMS screenshots for docs/public/cms/operations/
 * Usage:
 *   KOOBOO_SCREENSHOT_SCOPE=visitor-logs node scripts/cms-operations-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=resource-guardian node scripts/cms-operations-screenshots.mjs
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

async function snapDialog(page, name) {
  const dialog = page.locator('.el-dialog').last()
  await dialog.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(400)
  const file = path.join(OUT_DIR, name)
  await dialog.screenshot({ path: file })
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

async function waitResourceGuardianReady(page) {
  await page
    .waitForResponse(
      (r) => r.url().includes('ResourceLog') && r.status() === 200,
      { timeout: 90000 }
    )
    .catch(() => {})
  await page
    .locator('.resource-guardian')
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => {})
  await page.waitForTimeout(1500)
}

function resourceGuardianUrl(suffix = '') {
  const pathPart = suffix
    ? `resource-guardian/${suffix}`
    : 'resource-guardian'
  return `${BASE}/_Admin/system/${pathPart}?SiteId=${SITE_ID}`
}

async function captureResourceGuardian(page) {
  await page.goto(resourceGuardianUrl(), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await waitResourceGuardianReady(page)
  await page.evaluate(() => window.scrollTo(0, 0))

  const root = page.locator('.resource-guardian').first()
  await snapLocator(
    root.locator('> .flex.items-center.justify-between').first(),
    'resource-guardian-header.png'
  )
  await snap(page, 'resource-guardian-overview.png', { fullPage: true })
  await snapLocator(
    root.locator('> .flex.gap-24px').first(),
    'resource-guardian-toolbar.png'
  )
  const statCards = root.locator('.grid.grid-cols-4').first()
  if (await statCards.count()) {
    await snapLocator(statCards, 'resource-guardian-stat-cards.png')
  }

  const bandwidth = page.getByText(/带宽分析区块/).first()
  if (await bandwidth.count()) {
    const block = bandwidth.locator(
      'xpath=ancestor::div[contains(@class,"rounded-8px")][1]'
    )
    if (await block.count()) {
      await snapLocator(block, 'resource-guardian-bandwidth.png')
    }
  }

  const twoCol = root.locator('.grid.grid-cols-2').first()
  if (await twoCol.count()) {
    await snapLocator(twoCol, 'resource-guardian-composition-ranking.png')
  }

  const liveLog = page.getByText(/实时资源清单/).first()
  if (await liveLog.count()) {
    const block = liveLog.locator(
      'xpath=ancestor::div[contains(@class,"rounded-8px")][1]'
    )
    if (await block.count()) {
      await snapLocator(block, 'resource-guardian-live-log.png')
    }
  }

  const botTitle = page.getByText(/机器人情报分析/).first()
  if (await botTitle.count()) {
    const block = botTitle.locator(
      'xpath=ancestor::div[contains(@class,"rounded-8px")][1]'
    )
    if (await block.count()) {
      await snapLocator(block, 'resource-guardian-bot-intelligence.png')
    }
  }

  const external = page
    .getByText(/正在使用你资源的外部站点/)
    .first()
  if (await external.count()) {
    const block = external.locator(
      'xpath=ancestor::div[contains(@class,"rounded-8px")][1]'
    )
    if (await block.count()) {
      await snapLocator(block, 'resource-guardian-external-domains.png')
    }
  }

  const invalidCard = statCards.locator('> div').nth(1)
  if (await invalidCard.count()) {
    await invalidCard.click()
    await snapDialog(page, 'resource-guardian-invalid-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  const protectedCard = statCards.locator('> div').nth(2)
  if (await protectedCard.count()) {
    await protectedCard.click()
    await snapDialog(page, 'resource-guardian-protected-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  await page.goto(resourceGuardianUrl('protection-rules'), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await page
    .waitForResponse(
      (r) => r.url().includes('ResourceLog/Setting') && r.status() === 200,
      { timeout: 45000 }
    )
    .catch(() => {})
  await page.waitForTimeout(1200)
  const rulesMain = page.locator('.p-24.pb-150px').first()
  if (await rulesMain.count()) {
    await snapLocator(rulesMain, 'resource-guardian-protection-rules.png')
  }
  const addRule = page.getByRole('button', { name: /添加规则/ }).first()
  if (await addRule.count()) {
    await addRule.click()
    await snapDialog(page, 'resource-guardian-rule-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  await page.goto(resourceGuardianUrl('log-list'), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await waitResourceGuardianReady(page)
  const logHeader = page.locator('.relative.p-24, .p-24 .mb-24').first()
  const logTable = page.locator('.el-table').first()
  if ((await logHeader.count()) && (await logTable.count())) {
    const box = await logHeader.boundingBox()
    const tableBox = await logTable.boundingBox()
    if (box && tableBox) {
      const file = path.join(OUT_DIR, 'resource-guardian-log-list.png')
      await page.screenshot({
        path: file,
        clip: {
          x: Math.min(box.x, tableBox.x),
          y: box.y,
          width:
            Math.max(box.x + box.width, tableBox.x + tableBox.width) -
            Math.min(box.x, tableBox.x),
          height: tableBox.y + tableBox.height - box.y + 40,
        },
      })
      console.log('saved', file)
    }
  } else if (await logTable.count()) {
    await snapLocator(logTable, 'resource-guardian-log-list.png')
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
  if (!only || only === 'resource-guardian') {
    await captureResourceGuardian(page)
  }

  await browser.close()
  console.log('done →', OUT_DIR)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
