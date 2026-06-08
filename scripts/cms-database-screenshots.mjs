/**
 * Capture Kooboo admin CMS screenshots for docs/public/cms/database/
 * Usage:
 *   KOOBOO_SCREENSHOT_SCOPE=table node scripts/cms-database-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=table-relation node scripts/cms-database-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=key-value node scripts/cms-database-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=sqlite-table node scripts/cms-database-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=sql-logs node scripts/cms-database-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=mysql-table node scripts/cms-database-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=sqlserver-table node scripts/cms-database-screenshots.mjs
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

function tableRelationUrl() {
  return `${BASE}/_Admin/database/table-relation?SiteId=${SITE_ID}`
}

async function waitTableRelationList(page) {
  await page
    .waitForResponse(
      (r) => r.url().includes('TableRelation/list') && r.status() === 200,
      { timeout: 60000 }
    )
    .catch(() => {})
  await page
    .locator('.el-table, [data-cy="create-table-relation"]')
    .first()
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => {})
  await page.waitForTimeout(1200)
}

async function captureTableRelation(page) {
  await page.goto(tableRelationUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await waitTableRelationList(page)
  await page.evaluate(() => window.scrollTo(0, 0))

  const toolbar = page.locator('[data-cy="create-table-relation"]').locator('..').first()
  if (await toolbar.count()) {
    await snapLocator(toolbar, 'table-relation-toolbar.png')
  }
  const table = page.locator('.el-table').first()
  if (await table.count()) {
    await snapLocator(table, 'table-relation-list.png')
  }
  await snap(page, 'table-relation-overview.png', { fullPage: true })

  const createBtn = page.locator('[data-cy="create-table-relation"]').first()
  if (await createBtn.count()) {
    await createBtn.click()
    await page
      .waitForResponse(
        (r) =>
          r.url().includes('TableRelation/getTablesAndFields') &&
          r.status() === 200,
        { timeout: 60000 }
      )
      .catch(() => {})
    await page.waitForTimeout(800)
    await snapDialog(page, 'table-relation-create-dialog.png')
    await page.keyboard.press('Escape')
  }
}

function keyValueUrl() {
  return `${BASE}/_Admin/database/key-value?SiteId=${SITE_ID}`
}

async function waitKeyValueList(page) {
  await page
    .waitForResponse(
      (r) => r.url().includes('KeyValue/list') && r.status() === 200,
      { timeout: 60000 }
    )
    .catch(() => {})
  await page
    .locator('.el-table, [data-cy="create-key-value"]')
    .first()
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => {})
  await page.waitForTimeout(1200)
}

async function captureKeyValue(page) {
  await page.goto(keyValueUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await waitKeyValueList(page)
  await page.evaluate(() => window.scrollTo(0, 0))

  const toolbar = page.locator('[data-cy="create-key-value"]').locator('..').first()
  if (await toolbar.count()) {
    await snapLocator(toolbar, 'key-value-toolbar.png')
  }
  const table = page.locator('.el-table').first()
  if (await table.count()) {
    await snapLocator(table, 'key-value-list.png')
  }
  await snap(page, 'key-value-overview.png', { fullPage: true })

  const createBtn = page.locator('[data-cy="create-key-value"]').first()
  if (await createBtn.count()) {
    await createBtn.click()
    await snapDialog(page, 'key-value-edit-dialog.png')
    await page.keyboard.press('Escape')
  }
}

function sqliteTableUrl() {
  return `${BASE}/_Admin/database/sqlite-table?SiteId=${SITE_ID}`
}

const SQLITE_DB_TYPE = 'Sqlite'

async function captureSqliteTable(page) {
  await page.goto(sqliteTableUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await page
    .waitForResponse(
      (r) => r.url().includes('Sqlite/Tables') && r.status() === 200,
      { timeout: 60000 }
    )
    .catch(() => {})
  await page.waitForTimeout(1200)
  await page.evaluate(() => window.scrollTo(0, 0))

  const toolbar = page.locator('[data-cy="create-table"]').locator('..').first()
  if (await toolbar.count()) {
    await snapLocator(toolbar, 'sqlite-table-toolbar.png')
  }
  const table = page.locator('.el-table').first()
  if (await table.count()) {
    await snapLocator(table, 'sqlite-table-list.png')
  }
  await snap(page, 'sqlite-table-overview.png', { fullPage: true })

  const createBtn = page.locator('[data-cy="create-table"]').first()
  if (await createBtn.count()) {
    await createBtn.click()
    await snapDialog(page, 'sqlite-table-create-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  let tableName = null
  const nameLink = page.locator('[data-cy="name"]').first()
  if (await nameLink.count()) {
    tableName = (await nameLink.textContent())?.trim() || null
  }

  if (!tableName && (await createBtn.count())) {
    const docTable = `_cms_doc_sqlite_${Date.now().toString(36).slice(-6)}`
    await createBtn.click()
    await page.locator('[data-cy="table-name"]').fill(docTable)
    const confirm = page
      .locator('.el-dialog')
      .last()
      .getByRole('button', { name: /创建|create/i })
      .first()
    if (await confirm.count()) await confirm.click()
    await page.waitForTimeout(2500)
    tableName = docTable
  }

  if (tableName) {
    const enc = encodeURIComponent(tableName)
    await page.goto(
      `${BASE}/_Admin/database/table/data?SiteId=${SITE_ID}&table=${enc}&dbType=${SQLITE_DB_TYPE}`,
      { waitUntil: 'networkidle', timeout: 90000 }
    )
    await page.waitForTimeout(1500)

    const dataToolbar = page.locator('.p-24 > .flex.items-center.py-24').first()
    if (await dataToolbar.count()) {
      await snapLocator(dataToolbar, 'sqlite-table-data-toolbar.png')
    }
    const dataTable = page.locator('.el-table').first()
    if (await dataTable.count()) {
      await snapLocator(dataTable, 'sqlite-table-data.png')
    }

    const importBtn = page.getByRole('button', { name: /导入数据|import/i }).first()
    if (await importBtn.count()) {
      await importBtn.click()
      await page.waitForTimeout(600)
      await snapDialog(page, 'sqlite-table-import-dialog.png')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    }

    await page.goto(
      `${BASE}/_Admin/database/table/columns?SiteId=${SITE_ID}&table=${enc}&dbType=${SQLITE_DB_TYPE}`,
      { waitUntil: 'networkidle', timeout: 90000 }
    )
    await page.waitForTimeout(1500)
    await snap(page, 'sqlite-table-columns.png', { fullPage: true })

    const newCol = page.locator('[data-cy="new-column"]').first()
    if (await newCol.count()) {
      await newCol.click()
      await snapDialog(page, 'sqlite-table-column-dialog.png')
      await page.keyboard.press('Escape')
    }
  }
}

function sqlLogsUrl() {
  return `${BASE}/_Admin/database/sql-logs?SiteId=${SITE_ID}`
}

async function captureSqlLogs(page) {
  await page.goto(sqlLogsUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await page
    .waitForResponse(
      (r) => r.url().includes('SqlLog/') && r.status() === 200,
      { timeout: 60000 }
    )
    .catch(() => {})
  await page.waitForTimeout(1200)
  await page.evaluate(() => window.scrollTo(0, 0))

  const toolbar = page.locator('.p-24 > .flex.items-center.py-24').first()
  if (await toolbar.count()) {
    await snapLocator(toolbar, 'sql-logs-toolbar.png')
  }
  const table = page.locator('.el-table').first()
  if (await table.count()) {
    await snapLocator(table, 'sql-logs-list.png')
  }
  await snap(page, 'sql-logs-overview.png', { fullPage: true })

  let detailBtn = page.locator('.el-table__body .el-icon').first()
  if (!(await detailBtn.count())) {
    detailBtn = page.locator('[class*="icon-eyes"]').first()
  }
  if (await detailBtn.count()) {
    await detailBtn.click()
    await page.waitForTimeout(600)
    await snapDialog(page, 'sql-logs-detail-dialog.png')
    await page.keyboard.press('Escape')
  }
}

function mysqlTableUrl() {
  return `${BASE}/_Admin/database/mysql-table?SiteId=${SITE_ID}`
}

const MYSQL_DB_TYPE = 'MySql'

async function captureMysqlTable(page) {
  await page.goto(mysqlTableUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(2000)
  await page.evaluate(() => window.scrollTo(0, 0))

  const guidInfo = page.locator('.guid-info').first()
  if (await guidInfo.count()) {
    await snap(page, 'mysql-table-unconfigured.png', { fullPage: true })
    return
  }

  await page
    .waitForResponse(
      (r) => r.url().includes('MySql/Tables') && r.status() === 200,
      { timeout: 60000 }
    )
    .catch(() => {})
  await page.waitForTimeout(1200)

  const toolbar = page.locator('[data-cy="create-table"]').locator('..').first()
  if (await toolbar.count()) {
    await snapLocator(toolbar, 'mysql-table-toolbar.png')
  }
  const table = page.locator('.el-table').first()
  if (await table.count()) {
    await snapLocator(table, 'mysql-table-list.png')
  }
  await snap(page, 'mysql-table-overview.png', { fullPage: true })

  const createBtn = page.locator('[data-cy="create-table"]').first()
  if (await createBtn.count()) {
    await createBtn.click()
    await snapDialog(page, 'mysql-table-create-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  let tableName = null
  const nameLink = page.locator('[data-cy="name"]').first()
  if (await nameLink.count()) {
    tableName = (await nameLink.textContent())?.trim() || null
  }

  if (!tableName && (await createBtn.count())) {
    const docTable = `_cms_doc_mysql_${Date.now().toString(36).slice(-6)}`
    await createBtn.click()
    await page.locator('[data-cy="table-name"]').fill(docTable)
    const confirm = page
      .locator('.el-dialog')
      .last()
      .getByRole('button', { name: /创建|create/i })
      .first()
    if (await confirm.count()) await confirm.click()
    await page.waitForTimeout(2500)
    tableName = docTable
  }

  if (tableName) {
    const enc = encodeURIComponent(tableName)
    await page.goto(
      `${BASE}/_Admin/database/table/data?SiteId=${SITE_ID}&table=${enc}&dbType=${MYSQL_DB_TYPE}`,
      { waitUntil: 'networkidle', timeout: 90000 }
    )
    await page.waitForTimeout(1500)

    const dataToolbar = page.locator('.p-24 > .flex.items-center.py-24').first()
    if (await dataToolbar.count()) {
      await snapLocator(dataToolbar, 'mysql-table-data-toolbar.png')
    }
    const dataTable = page.locator('.el-table').first()
    if (await dataTable.count()) {
      await snapLocator(dataTable, 'mysql-table-data.png')
    }

    const importBtn = page.getByRole('button', { name: /导入数据|import/i }).first()
    if (await importBtn.count()) {
      await importBtn.click()
      await page.waitForTimeout(600)
      await snapDialog(page, 'mysql-table-import-dialog.png')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    }

    await page.goto(
      `${BASE}/_Admin/database/table/columns?SiteId=${SITE_ID}&table=${enc}&dbType=${MYSQL_DB_TYPE}`,
      { waitUntil: 'networkidle', timeout: 90000 }
    )
    await page.waitForTimeout(1500)
    await snap(page, 'mysql-table-columns.png', { fullPage: true })

    const newCol = page.locator('[data-cy="new-column"]').first()
    if (await newCol.count()) {
      await newCol.click()
      await snapDialog(page, 'mysql-table-column-dialog.png')
      await page.keyboard.press('Escape')
    }
  }
}

function sqlServerTableUrl() {
  return `${BASE}/_Admin/database/sqlserver-table?SiteId=${SITE_ID}`
}

const SQLSERVER_DB_TYPE = 'SqlServer'

async function captureSqlServerTable(page) {
  await page.goto(sqlServerTableUrl(), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await page.waitForTimeout(2000)
  await page.evaluate(() => window.scrollTo(0, 0))

  const guidInfo = page.locator('.guid-info').first()
  if (await guidInfo.count()) {
    await snap(page, 'sqlserver-table-unconfigured.png', { fullPage: true })
    return
  }

  await page
    .waitForResponse(
      (r) => r.url().includes('SqlServer/Tables') && r.status() === 200,
      { timeout: 60000 }
    )
    .catch(() => {})
  await page.waitForTimeout(1200)

  const toolbar = page.locator('[data-cy="create-table"]').locator('..').first()
  if (await toolbar.count()) {
    await snapLocator(toolbar, 'sqlserver-table-toolbar.png')
  }
  const table = page.locator('.el-table').first()
  if (await table.count()) {
    await snapLocator(table, 'sqlserver-table-list.png')
  }
  await snap(page, 'sqlserver-table-overview.png', { fullPage: true })

  const createBtn = page.locator('[data-cy="create-table"]').first()
  if (await createBtn.count()) {
    await createBtn.click()
    await snapDialog(page, 'sqlserver-table-create-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  let tableName = null
  const nameLink = page.locator('[data-cy="name"]').first()
  if (await nameLink.count()) {
    tableName = (await nameLink.textContent())?.trim() || null
  }

  if (!tableName && (await createBtn.count())) {
    const docTable = `_cms_doc_sqlsrv_${Date.now().toString(36).slice(-6)}`
    await createBtn.click()
    await page.locator('[data-cy="table-name"]').fill(docTable)
    const confirm = page
      .locator('.el-dialog')
      .last()
      .getByRole('button', { name: /创建|create/i })
      .first()
    if (await confirm.count()) await confirm.click()
    await page.waitForTimeout(2500)
    tableName = docTable
  }

  if (tableName) {
    const enc = encodeURIComponent(tableName)
    await page.goto(
      `${BASE}/_Admin/database/table/data?SiteId=${SITE_ID}&table=${enc}&dbType=${SQLSERVER_DB_TYPE}`,
      { waitUntil: 'networkidle', timeout: 90000 }
    )
    await page.waitForTimeout(1500)

    const dataToolbar = page.locator('.p-24 > .flex.items-center.py-24').first()
    if (await dataToolbar.count()) {
      await snapLocator(dataToolbar, 'sqlserver-table-data-toolbar.png')
    }
    const dataTable = page.locator('.el-table').first()
    if (await dataTable.count()) {
      await snapLocator(dataTable, 'sqlserver-table-data.png')
    }

    const importBtn = page.getByRole('button', { name: /导入数据|import/i }).first()
    if (await importBtn.count()) {
      await importBtn.click()
      await page.waitForTimeout(600)
      await snapDialog(page, 'sqlserver-table-import-dialog.png')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    }

    await page.goto(
      `${BASE}/_Admin/database/table/columns?SiteId=${SITE_ID}&table=${enc}&dbType=${SQLSERVER_DB_TYPE}`,
      { waitUntil: 'networkidle', timeout: 90000 }
    )
    await page.waitForTimeout(1500)
    await snap(page, 'sqlserver-table-columns.png', { fullPage: true })

    const newCol = page.locator('[data-cy="new-column"]').first()
    if (await newCol.count()) {
      await newCol.click()
      await snapDialog(page, 'sqlserver-table-column-dialog.png')
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
  if (only === 'table-relation') {
    await captureTableRelation(page)
  }
  if (only === 'key-value') {
    await captureKeyValue(page)
  }
  if (only === 'sqlite-table') {
    await captureSqliteTable(page)
  }
  if (only === 'sql-logs') {
    await captureSqlLogs(page)
  }
  if (only === 'mysql-table') {
    await captureMysqlTable(page)
  }
  if (only === 'sqlserver-table') {
    await captureSqlServerTable(page)
  }

  await browser.close()
  console.log('done →', OUT_DIR)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
