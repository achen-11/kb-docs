/**
 * Capture Kooboo admin CMS screenshots for docs/public/cms/operations/
 * Usage:
 *   KOOBOO_SCREENSHOT_SCOPE=visitor-logs node scripts/cms-operations-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=resource-guardian node scripts/cms-operations-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=page-interaction node scripts/cms-operations-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=ab-testing node scripts/cms-operations-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=site-logs node scripts/cms-operations-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=sync node scripts/cms-operations-screenshots.mjs
 *
 * Local Kooboo example (AB 测试未上 redev 时):
 *   KOOBOO_BASE=http://localhost KOOBOO_SITE_ID=... KOOBOO_USER=... KOOBOO_PASS=... \\
 *   KOOBOO_SCREENSHOT_SCOPE=ab-testing node scripts/cms-operations-screenshots.mjs
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

function pageInteractionUrl(suffix = '') {
  const pathPart = suffix ? `page-interaction/${suffix}` : 'page-interaction'
  return `${BASE}/_Admin/system/${pathPart}?SiteId=${SITE_ID}`
}

async function waitPageInteractionStats(page) {
  await page
    .waitForResponse(
      (r) =>
        r.url().includes('PageInteraction/GetStats') && r.status() === 200,
      { timeout: 90000 }
    )
    .catch(() => {})
  await page
    .locator('.page-interaction')
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => {})
  await page.waitForTimeout(1500)
}

async function ensurePageInteractionEnabled(page) {
  const root = page.locator('.page-interaction').first()
  const sw = root.locator('.el-switch').first()
  if (!(await sw.count())) return
  if (!(await sw.locator('.is-checked').count())) {
    await sw.click()
    await page.waitForTimeout(2000)
    await waitPageInteractionStats(page)
  }
}

async function openPageInteractionDetail(page, context) {
  const findDetail = () =>
    context.pages().find((p) => p.url().includes('page-interaction/detail'))

  const pageLink = page.locator('.page-interaction .el-table .el-link').first()
  if (await pageLink.count()) {
    await pageLink.click()
    await page.waitForTimeout(2500)
    let detail = findDetail()
    if (detail) {
      await detail.waitForLoadState('domcontentloaded', { timeout: 60000 })
      await detail.waitForTimeout(3000)
      return detail
    }
    if (page.url().includes('page-interaction/detail')) {
      await page.waitForTimeout(3000)
      return page
    }
  }

  const editBtn = page.getByRole('button', { name: /编辑锚点/ }).first()
  if (await editBtn.count()) {
    await editBtn.click()
    await page.waitForTimeout(2500)
    const detail = findDetail()
    if (detail) {
      await detail.waitForLoadState('domcontentloaded', { timeout: 60000 })
      await detail.waitForTimeout(3000)
      return detail
    }
    if (page.url().includes('page-interaction/detail')) {
      await page.waitForTimeout(3000)
      return page
    }
  }

  const { startDate, endDate } = await readDateRange(page)
  const fallback = `${pageInteractionUrl('detail')}&path=${encodeURIComponent('/')}&startDate=${startDate || ''}&endDate=${endDate || ''}&type=Page`
  await page.goto(fallback, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(4000)
  return page
}

async function capturePageInteraction(page, context) {
  await page.goto(pageInteractionUrl(), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await waitPageInteractionStats(page)
  await ensurePageInteractionEnabled(page)

  const root = page.locator('.page-interaction').first()
  await page.evaluate(() => window.scrollTo(0, 0))
  await snapLocator(
    root.locator('> .flex.items-center.justify-between').first(),
    'page-interaction-header.png'
  )
  await snap(page, 'page-interaction-overview.png', { fullPage: true })

  const editEntry = root.locator('> .mb-16').first()
  if (await editEntry.count()) {
    await snapLocator(editEntry, 'page-interaction-edit-entry.png')
  }

  const overviewTitle = page.getByText(/页面锚点点击总览/).first()
  if (await overviewTitle.count()) {
    const block = overviewTitle.locator(
      'xpath=ancestor::div[contains(@class,"rounded-normal")][1]'
    )
    if (await block.count()) {
      await snapLocator(block, 'page-interaction-overview-block.png')
    }
  }

  const anchorGrid = root.locator('.grid.grid-cols-2.gap-12').first()
  if (await anchorGrid.count()) {
    await snapLocator(anchorGrid, 'page-interaction-anchor-sections.png')
  }

  const detailPage = await openPageInteractionDetail(page, context)

  if (detailPage && !detailPage.isClosed()) {
    await detailPage.setViewportSize({ width: 1440, height: 900 })
    const detailRoot = detailPage.locator('.absolute.inset-0.flex.flex-col').first()
    if (await detailRoot.count()) {
      await snapLocator(detailRoot, 'page-interaction-detail.png')
    } else {
      await snap(detailPage, 'page-interaction-detail.png', { fullPage: true })
    }

    const anchorRow = detailPage
      .locator('.hover\\:bg-blue\\/10.rounded-normal')
      .first()
    if (await anchorRow.count()) {
      await anchorRow.click()
      await detailPage.waitForTimeout(600)
      await snap(detailPage, 'page-interaction-detail-anchor-stats.png', {
        fullPage: true,
      })
    } else {
      await snap(detailPage, 'page-interaction-detail-anchor-stats.png', {
        fullPage: true,
      })
    }

    const detailUrl = new URL(detailPage.url())
    const pagePath = detailUrl.searchParams.get('path') || '/'
    const startDate = detailUrl.searchParams.get('startDate') || ''
    const endDate = detailUrl.searchParams.get('endDate') || ''
    const id = detailUrl.searchParams.get('id') || ''
    const type = detailUrl.searchParams.get('type') || ''
    const editorQ = new URLSearchParams({
      SiteId: SITE_ID,
      path: pagePath,
      startDate,
      endDate,
    })
    if (id) editorQ.set('id', id)
    if (type) editorQ.set('type', type)

    const editorPage = await context.newPage()
    await editorPage.setViewportSize({ width: 1440, height: 900 })
    await editorPage.goto(
      `${BASE}/_Admin/visual-anchor-editor?${editorQ}`,
      { waitUntil: 'networkidle', timeout: 90000 }
    )
    await editorPage.waitForTimeout(5000)
    await snap(editorPage, 'page-interaction-visual-editor.png', {
      fullPage: true,
    })
    await editorPage.close()
    await detailPage.close()
  }
}

function abTestingUrl(suffix = '', query = {}) {
  const pathPart = suffix ? `ab-testing/${suffix}` : 'ab-testing'
  const q = new URLSearchParams({ SiteId: SITE_ID, ...query })
  return `${BASE}/_Admin/system/${pathPart}?${q}`
}

async function waitAbTestingList(page) {
  await page
    .waitForResponse(
      (r) => r.url().includes('abTesting/Info') && r.status() === 200,
      { timeout: 90000 }
    )
    .catch(() => {})
  await page.waitForSelector('.el-table', { state: 'visible', timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1200)
}

async function clickNextStep(page) {
  const next = page.getByRole('button', { name: /下一步|next/i }).first()
  if (await next.count()) {
    await next.click()
    await page.waitForTimeout(900)
  }
}

const AB_TEST_SAMPLE_NAME = '_cms_doc_screenshot'

async function fillCreateWizard(page, { snapSteps = false } = {}) {
  await page.goto(abTestingUrl('create'), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await page.waitForSelector('.el-steps', { timeout: 30000 })
  const formBox = page.locator('.max-w-800px').first()

  const nameInput = page
    .locator('.el-form-item')
    .filter({ hasText: /实验名称|experiment/i })
    .locator('input')
    .first()
  if (await nameInput.count()) {
    await nameInput.fill(AB_TEST_SAMPLE_NAME)
  }
  if (snapSteps) {
    await snapLocator(formBox, 'ab-testing-create-step-basic.png')
  }
  await clickNextStep(page)

  const typeSelect = page.locator('.el-form .el-select').first()
  if (await typeSelect.count()) {
    await typeSelect.click()
    await page.locator('.el-select-dropdown__item:visible').first().click()
    await page.waitForTimeout(600)
  }
  const objectSelect = page.locator('.el-form .el-select').nth(1)
  if (await objectSelect.count()) {
    await objectSelect.click()
    await page.waitForTimeout(1500)
    const opt = page.locator('.el-select-dropdown__item:visible').first()
    if (await opt.count()) await opt.click()
    await page.waitForTimeout(600)
  }
  if (snapSteps) {
    await snapLocator(formBox, 'ab-testing-create-step-goal.png')
  }
  await clickNextStep(page)

  if (snapSteps) {
    await snapLocator(formBox, 'ab-testing-create-step-config.png')
  }
  await clickNextStep(page)

  if (snapSteps) {
    await snapLocator(formBox, 'ab-testing-create-step-traffic.png')
  }
}

async function snapCreateWizardSteps(page) {
  await fillCreateWizard(page, { snapSteps: true })
}

async function ensureSampleAbTest(page) {
  await page.goto(abTestingUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await waitAbTestingList(page)
  if (
    await page
      .locator('.el-table__body')
      .getByText(AB_TEST_SAMPLE_NAME, { exact: true })
      .count()
  ) {
    return AB_TEST_SAMPLE_NAME
  }

  await fillCreateWizard(page, { snapSteps: false })
  const saveBtn = page.getByRole('button', { name: /^保存$|^save$/i }).first()
  if (await saveBtn.count()) {
    await saveBtn.click()
    await page
      .waitForURL((url) => !url.pathname.includes('/create'), {
        timeout: 60000,
      })
      .catch(() => {})
    await waitAbTestingList(page)
  }
  return AB_TEST_SAMPLE_NAME
}

async function captureAbTesting(page) {
  await ensureSampleAbTest(page)

  await page.goto(abTestingUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await waitAbTestingList(page)
  await page.evaluate(() => window.scrollTo(0, 0))

  const headerRow = page.locator('.p-24 > .flex.items-center.justify-between').first()
  if (await headerRow.count()) {
    await snapLocator(headerRow, 'ab-testing-header.png')
  }
  await snap(page, 'ab-testing-overview.png', { fullPage: true })

  const toolbar = page.locator('.flex.space-x-16.mt-16').first()
  if (await toolbar.count()) {
    await snapLocator(toolbar, 'ab-testing-list-toolbar.png')
  }
  const table = page.locator('.el-table').first()
  if (await table.count()) {
    await snapLocator(table, 'ab-testing-list-table.png')
  }

  await snapCreateWizardSteps(page)

  await page.goto(abTestingUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await waitAbTestingList(page)

  let testName = AB_TEST_SAMPLE_NAME
  const nameCell = page.locator('.el-table__body .text-blue').first()
  if (await nameCell.count()) {
    const fromList = ((await nameCell.textContent()) || '').trim().split('\n')[0]
    if (fromList) testName = fromList
  }
  if (!testName) {
    const rowAction = page
      .locator('.el-table__body tr')
      .first()
      .locator('.cursor-pointer')
      .first()
    if (await rowAction.count()) {
      await rowAction.click()
      await page.waitForURL(/ab-testing\/report/, { timeout: 30000 }).catch(() => {})
      const url = new URL(page.url())
      testName = url.searchParams.get('name') || ''
    }
  }

  if (testName && !page.url().includes('report')) {
    await page.goto(abTestingUrl('report', { name: testName }), {
      waitUntil: 'networkidle',
      timeout: 90000,
    })
    await page
      .waitForResponse(
        (r) => r.url().includes('abTesting/Report') && r.status() === 200,
        { timeout: 45000 }
      )
      .catch(() => {})
    await page.waitForTimeout(1500)

    const reportHeader = page.locator('.p-24 > .flex.items-center.gap-8').first()
    if (await reportHeader.count()) {
      await snapLocator(reportHeader, 'ab-testing-report-header.png')
    }

    const detailTab = page.getByRole('tab', { name: /实验详情/ }).first()
    if (await detailTab.count()) {
      await detailTab.click()
      await page.waitForTimeout(600)
    }
    await snap(page, 'ab-testing-report-detail.png', { fullPage: true })

    const reportTab = page.getByRole('tab', { name: /实验报告/ }).first()
    if (await reportTab.count()) {
      await reportTab.click()
      await page.waitForTimeout(800)
    }
    await snap(page, 'ab-testing-report-report.png', { fullPage: true })
  } else if (page.url().includes('ab-testing/report')) {
    const detailTab = page.getByRole('tab', { name: /实验详情/ }).first()
    if (await detailTab.count()) await detailTab.click()
    await page.waitForTimeout(600)
    await snap(page, 'ab-testing-report-detail.png', { fullPage: true })
    const reportTab = page.getByRole('tab', { name: /实验报告/ }).first()
    if (await reportTab.count()) await reportTab.click()
    await page.waitForTimeout(800)
    await snap(page, 'ab-testing-report-report.png', { fullPage: true })
  }
}

function siteLogsUrl(suffix = '', query = {}) {
  const pathPart = suffix ? `site-logs/${suffix}` : 'site-logs'
  const q = new URLSearchParams({ SiteId: SITE_ID, ...query })
  return `${BASE}/_Admin/system/${pathPart}?${q}`
}

async function waitSiteLogsList(page) {
  await page
    .waitForResponse(
      (r) => r.url().includes('SiteLog/list') && r.status() === 200,
      { timeout: 90000 }
    )
    .catch(() => {})
  await page
    .waitForSelector('.el-table', { state: 'visible', timeout: 30000 })
    .catch(() => {})
  await page.waitForTimeout(1200)
}

async function captureSiteLogs(page, context) {
  await page.goto(siteLogsUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await waitSiteLogsList(page)
  await page.evaluate(() => window.scrollTo(0, 0))

  const filters = page.locator('.p-24 > .flex.space-x-16').first()
  if (await filters.count()) {
    await snapLocator(filters, 'site-logs-filters.png')
  }
  await snap(page, 'site-logs-overview.png', { fullPage: true })

  const table = page.locator('.el-table').first()
  if (await table.count()) {
    await snapLocator(table, 'site-logs-table.png')
  }

  const firstRow = page.locator('.el-table__body tr').first()
  if (await firstRow.count()) {
    await firstRow.locator('.el-checkbox').click().catch(() => {})
    await page.waitForTimeout(500)
    const checkout = page.locator('[data-cy="checkout"]').first()
    if (await checkout.count()) {
      await checkout.click()
      await snapDialog(page, 'site-logs-checkout-dialog.png')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    }
  }

  const logItem = page.locator('[data-cy="log-item"]').first()
  if (await logItem.count()) {
    await logItem.click()
    await page.waitForURL(/site-logs\/versions/, { timeout: 30000 })
    await page.waitForTimeout(1500)
    await snap(page, 'site-logs-versions.png', { fullPage: true })

    const versionRows = page.locator('.el-table__body tr')
    const rowCount = await versionRows.count()
    if (rowCount >= 1) {
      const pickRow = rowCount >= 2 ? 1 : 0
      await versionRows.nth(pickRow).locator('.el-checkbox').click().catch(() => {})
      await page.waitForTimeout(400)
      const compareBtn = page.locator('[data-cy="compare-with-current"]').first()
      if (await compareBtn.count()) {
        const pagesBefore = context.pages().length
        await compareBtn.click()
        await page.waitForTimeout(2000)
        let comparePage =
          context.pages().find((p) => p.url().includes('version-compare')) ||
          (context.pages().length > pagesBefore
            ? context.pages()[context.pages().length - 1]
            : null)
        if (comparePage && comparePage.url().includes('version-compare')) {
          await comparePage.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
          await comparePage.waitForTimeout(2000)
          await snap(comparePage, 'site-logs-version-compare.png', {
            fullPage: true,
          })
          if (comparePage !== page) await comparePage.close()
        }
      }
    }
  }
}

function syncUrl(suffix = '', query = {}) {
  const pathPart = suffix ? `sync/${suffix}` : 'sync'
  const q = new URLSearchParams({ SiteId: SITE_ID, ...query })
  return `${BASE}/_Admin/system/${pathPart}?${q}`
}

async function waitSyncList(page) {
  await page
    .waitForResponse(
      (r) => r.url().includes('publish/list') && r.status() === 200,
      { timeout: 90000 }
    )
    .catch(() => {})
  await page
    .waitForSelector('.el-table', { state: 'visible', timeout: 30000 })
    .catch(() => {})
  await page.waitForTimeout(1200)
}

async function ensureSyncRelation(page) {
  await page.goto(syncUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await waitSyncList(page)
  if ((await page.locator('.el-table__body tr').count()) > 0) return

  const newSync = page.locator('[data-cy="new-sync"]').first()
  if (!(await newSync.count())) return
  await newSync.click()
  await page.waitForTimeout(800)
  const serverSelect = page.locator('.el-dialog [data-cy="servers"]').first()
  if (!(await serverSelect.count())) {
    await page.keyboard.press('Escape')
    return
  }
  await serverSelect.click()
  const serverOpt = page.locator('[data-cy="server-opt"]').first()
  if (!(await serverOpt.count())) {
    await page.keyboard.press('Escape')
    return
  }
  await serverOpt.click()
  await page.waitForTimeout(2500)
  const siteSelect = page.locator('.el-dialog [data-cy="sites"]').first()
  if (await siteSelect.count()) {
    await siteSelect.click()
    const siteOpt = page.locator('[data-cy="site-opt"]').first()
    if (await siteOpt.count()) {
      await siteOpt.click()
      const confirm = page
        .locator('.el-dialog')
        .last()
        .getByRole('button', { name: /确定|确认|保存|save/i })
        .first()
      if (await confirm.count()) await confirm.click()
      await waitSyncList(page)
      return
    }
  }
  await page.keyboard.press('Escape')
}

async function captureSync(page) {
  await ensureSyncRelation(page)
  await page.goto(syncUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await waitSyncList(page)
  await page.evaluate(() => window.scrollTo(0, 0))

  const toolbar = page.locator('.p-24 > .flex.items-center.py-24').first()
  if (await toolbar.count()) {
    await snapLocator(toolbar, 'sync-toolbar.png')
  }
  await snap(page, 'sync-overview.png', { fullPage: true })

  const table = page.locator('.el-table').first()
  if (await table.count()) {
    await snapLocator(table, 'sync-list-table.png')
  }

  const newSync = page.locator('[data-cy="new-sync"]').first()
  if (await newSync.count()) {
    await newSync.click()
    await snapDialog(page, 'sync-add-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  const firstRow = page.locator('.el-table__body tr').first()
  if (await firstRow.count()) {
    const progressIcon = firstRow.locator('.icon-a-debug-step-over').first()
    if (await progressIcon.count()) {
      await progressIcon.click()
      await snapDialog(page, 'sync-progress-dialog.png')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    }

    const diffLink = firstRow.locator('a').first()
    if (await diffLink.count()) {
      await diffLink.click()
      await page.waitForURL(/sync\/list/, { timeout: 30000 })
      await page.waitForTimeout(2000)
      await snap(page, 'sync-publishing.png', { fullPage: true })
      const changesTable = page.locator('.el-tab-pane:visible .el-table').first()
      if (await changesTable.count()) {
        await snapLocator(changesTable, 'sync-local-changes.png')
      } else {
        await snapLocator(page.locator('.el-tabs').first(), 'sync-local-changes.png')
      }
      await page.goto(syncUrl(), { waitUntil: 'networkidle', timeout: 90000 })
      await waitSyncList(page)
    }
  }

  const serverBtn = page.locator('.icon-yunfuwuqi').first()
  if (await serverBtn.count()) {
    await serverBtn.click()
    await page.waitForURL(/sync\/server/, { timeout: 30000 })
    await page.waitForTimeout(1500)
    await snap(page, 'sync-server-list.png', { fullPage: true })
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
  if (!only || only === 'page-interaction') {
    await capturePageInteraction(page, context)
  }
  if (!only || only === 'ab-testing') {
    await captureAbTesting(page)
  }
  if (!only || only === 'site-logs') {
    await captureSiteLogs(page, context)
  }
  if (!only || only === 'sync') {
    await captureSync(page)
  }

  await browser.close()
  console.log('done →', OUT_DIR)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
