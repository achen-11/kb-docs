/**
 * Capture Kooboo admin CMS screenshots for docs/public/cms/database/
 * Usage:
 *   KOOBOO_SCREENSHOT_SCOPE=table node scripts/cms-database-screenshots.mjs
 */
import './load-env.mjs'
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const REPO_ROOT =
  process.env.KOOBOO_DOCS_ROOT ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(REPO_ROOT, 'docs/public/cms/database')

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
  const file = path.join(OUT_DIR, name)
  await page.screenshot({ path: file, fullPage: options.fullPage ?? false })
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

function tableUrl() {
  return `${BASE}/_Admin/database/table?SiteId=${SITE_ID}`
}

async function waitTableList(page) {
  await page
    .waitForResponse(
      (r) => r.url().includes('Database/Tables') && r.status() === 200,
      { timeout: 60000 }
    )
    .catch(() => {})
  await page
    .locator('.el-table, [data-cy="create-table"]')
    .first()
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => {})
  await page.waitForTimeout(1200)
}

async function captureIndexedDbTable(page) {
  await page.goto(tableUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await waitTableList(page)
  await page.evaluate(() => window.scrollTo(0, 0))

  const toolbar = page.locator('[data-cy="create-table"]').locator('..').first()
  if (await toolbar.count()) {
    await snapLocator(toolbar, 'table-toolbar.png')
  }
  const table = page.locator('.el-table').first()
  if (await table.count()) {
    await snapLocator(table, 'table-list.png')
  }
  await snap(page, 'table-overview.png', { fullPage: true })

  const createBtn = page.locator('[data-cy="create-table"]').first()
  if (await createBtn.count()) {
    await createBtn.click()
    await snapDialog(page, 'table-create-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  let tableName = null
  const nameLink = page.locator('[data-cy="name"]').first()
  if (await nameLink.count()) {
    tableName = (await nameLink.textContent())?.trim() || null
  }

  if (!tableName && (await createBtn.count())) {
    const docTable = `_cms_doc_idb_${Date.now().toString(36).slice(-6)}`
    await createBtn.click()
    await page.locator('[data-cy="table-name"]').fill(docTable)
    const confirm = page
      .locator('.el-dialog')
      .last()
      .getByRole('button', { name: /创建|create/i })
      .first()
    if (await confirm.count()) await confirm.click()
    await page.waitForTimeout(2000)
    await waitTableList(page)
    tableName = docTable
  }

  if (tableName) {
    await page.goto(
      `${BASE}/_Admin/database/table/data?SiteId=${SITE_ID}&table=${encodeURIComponent(tableName)}`,
      { waitUntil: 'networkidle', timeout: 90000 }
    )
    await page.waitForTimeout(1500)

    const dataToolbar = page.locator('.p-24 > .flex.items-center.py-24').first()
    if (await dataToolbar.count()) {
      await snapLocator(dataToolbar, 'table-data-toolbar.png')
    }
    const dataTable = page.locator('.el-table').first()
    if (await dataTable.count()) {
      await snapLocator(dataTable, 'table-data.png')
    }

    await page.goto(
      `${BASE}/_Admin/database/table/edit-data?SiteId=${SITE_ID}&table=${encodeURIComponent(tableName)}`,
      { waitUntil: 'networkidle', timeout: 90000 }
    )
    await page.waitForTimeout(1200)
    const formCard = page.locator('.edit-data .rounded-normal').first()
    if (await formCard.count()) {
      await snapLocator(formCard, 'table-edit-data.png')
    } else {
      await snap(page, 'table-edit-data.png', { fullPage: true })
    }

    await page.goto(
      `${BASE}/_Admin/database/table/columns?SiteId=${SITE_ID}&table=${encodeURIComponent(tableName)}`,
      { waitUntil: 'networkidle', timeout: 90000 }
    )
    await page.waitForTimeout(1500)
    await snap(page, 'table-columns.png', { fullPage: true })

    const newCol = page.locator('[data-cy="new-column"]').first()
    if (await newCol.count()) {
      await newCol.click()
      await snapDialog(page, 'table-column-dialog.png')
      await page.keyboard.press('Escape')
    }
  }
}

async function main() {
  const only = process.env.KOOBOO_SCREENSHOT_SCOPE || 'table'
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()
  await login(page)

  if (only === 'table') {
    await captureIndexedDbTable(page)
  }

  await browser.close()
  console.log('done →', OUT_DIR)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
