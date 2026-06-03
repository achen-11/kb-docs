/**
 * Capture Kooboo admin CMS screenshots for docs/public/cms/development/
 * Usage:
 *   KOOBOO_SCREENSHOT_SCOPE=views node scripts/cms-development-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=layouts node scripts/cms-development-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=scripts node scripts/cms-development-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=styles node scripts/cms-development-screenshots.mjs
 */
import './load-env.mjs'
import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const REPO_ROOT =
  process.env.KOOBOO_DOCS_ROOT ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(REPO_ROOT, 'docs/public/cms/development')

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

function viewsUrl() {
  return `${BASE}/_Admin/development/views?SiteId=${SITE_ID}`
}

function viewEditUrl(id) {
  const q = id ? `&id=${id}` : ''
  return `${BASE}/_Admin/development/view/edit?SiteId=${SITE_ID}${q}`
}

async function waitViewsList(page) {
  await page
    .waitForResponse(
      (r) => r.url().includes('/View') && r.status() === 200,
      { timeout: 60000 }
    )
    .catch(() => {})
  await page
    .locator('.el-table')
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => {})
  await page.waitForTimeout(1200)
}

async function captureViews(page) {
  await page.goto(viewsUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await waitViewsList(page)
  await page.evaluate(() => window.scrollTo(0, 0))

  const toolbar = page.locator('.p-24 > .flex.items-center.py-24').first()
  if (await toolbar.count()) {
    await snapLocator(toolbar, 'views-toolbar.png')
  }
  await snap(page, 'views-overview.png', { fullPage: true })

  const table = page.locator('.el-table').first()
  if (await table.count()) {
    await snapLocator(table, 'views-list-table.png')
  }

  const firstRow = page.locator('.el-table__body tr').first()
  if (await firstRow.count()) {
    await firstRow.locator('.el-checkbox').click()
    await page.waitForTimeout(400)
    const copyBtn = page.locator('[data-cy="copy"]').first()
    if (await copyBtn.count()) {
      await copyBtn.click()
      await snapDialog(page, 'views-copy-dialog.png')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    }
    await firstRow.locator('.el-checkbox').click().catch(() => {})

    const nameLink = page.locator('[data-cy="name"]').first()
    if (await nameLink.count()) {
      await nameLink.click()
      await page.waitForURL(/view\/edit/, { timeout: 30000 })
      await page.waitForTimeout(2000)
      const header = page
        .locator('.border-b.border-solid.border-line')
        .first()
      if (await header.count()) {
        await snapLocator(header, 'views-edit-header.png')
      }
      await snap(page, 'views-edit-overview.png', { fullPage: false })

      const settingBtn = page.getByRole('button', { name: /设置|setting/i }).first()
      if (await settingBtn.count()) {
        await settingBtn.click()
        await snapDialog(page, 'views-setting-dialog.png')
        await page.keyboard.press('Escape')
      }
    }
  } else {
    await page.goto(viewEditUrl(), { waitUntil: 'networkidle', timeout: 90000 })
    await page.waitForTimeout(2000)
    const header = page.locator('.border-b.border-solid.border-line').first()
    if (await header.count()) {
      await snapLocator(header, 'views-edit-header.png')
    }
    await snap(page, 'views-edit-overview.png', { fullPage: false })
    const settingBtn = page.getByRole('button', { name: /设置|setting/i }).first()
    if (await settingBtn.count()) {
      await settingBtn.click()
      await snapDialog(page, 'views-setting-dialog.png')
      await page.keyboard.press('Escape')
    }
  }
}

function layoutsUrl() {
  return `${BASE}/_Admin/development/layouts?SiteId=${SITE_ID}`
}

function layoutEditUrl(id) {
  const q = id ? `&id=${id}` : ''
  return `${BASE}/_Admin/development/layout/edit?SiteId=${SITE_ID}${q}`
}

async function waitLayoutsList(page) {
  await page
    .waitForResponse(
      (r) => r.url().includes('/Layout') && r.status() === 200,
      { timeout: 60000 }
    )
    .catch(() => {})
  await page
    .locator('.el-table')
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => {})
  await page.waitForTimeout(1200)
}

async function captureLayouts(page) {
  await page.goto(layoutsUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await waitLayoutsList(page)
  await page.evaluate(() => window.scrollTo(0, 0))

  const toolbar = page.locator('.p-24 > .flex.items-center.py-24').first()
  if (await toolbar.count()) {
    await snapLocator(toolbar, 'layouts-toolbar.png')
  }
  await snap(page, 'layouts-overview.png', { fullPage: true })

  const table = page.locator('.el-table').first()
  if (await table.count()) {
    await snapLocator(table, 'layouts-list-table.png')
  }

  const firstRow = page.locator('.el-table__body tr').first()
  if (await firstRow.count()) {
    await firstRow.locator('.el-checkbox').click()
    await page.waitForTimeout(400)
    const copyBtn = page.locator('[data-cy="copy"]').first()
    if (await copyBtn.count()) {
      await copyBtn.click()
      await snapDialog(page, 'layouts-copy-dialog.png')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    }
    await firstRow.locator('.el-checkbox').click().catch(() => {})

    const nameLink = page.locator('[data-cy="name"]').first()
    if (await nameLink.count()) {
      await nameLink.click()
      await page.waitForURL(/layout\/edit/, { timeout: 30000 })
      await page.waitForTimeout(2000)
      const header = page
        .locator('.border-b.border-solid.border-line')
        .first()
      if (await header.count()) {
        await snapLocator(header, 'layouts-edit-header.png')
      }
      await snap(page, 'layouts-edit-overview.png', { fullPage: false })
    }
  } else {
    await page.goto(layoutEditUrl(), { waitUntil: 'networkidle', timeout: 90000 })
    await page.waitForTimeout(2000)
    const header = page.locator('.border-b.border-solid.border-line').first()
    if (await header.count()) {
      await snapLocator(header, 'layouts-edit-header.png')
    }
    await snap(page, 'layouts-edit-overview.png', { fullPage: false })
  }
}

function scriptsUrl(tab = 'external') {
  return `${BASE}/_Admin/development/scripts?SiteId=${SITE_ID}&name=${tab}`
}

function scriptEditUrl(id) {
  const q = id ? `&id=${id}` : ''
  return `${BASE}/_Admin/development/script/edit?SiteId=${SITE_ID}${q}`
}

async function waitScriptsExternal(page) {
  await page
    .waitForResponse(
      (r) => r.url().includes('Script') && r.status() === 200,
      { timeout: 60000 }
    )
    .catch(() => {})
  await page
    .locator('.el-table')
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => {})
  await page.waitForTimeout(1200)
}

async function captureScripts(page) {
  await page.goto(scriptsUrl('external'), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await waitScriptsExternal(page)
  await page.evaluate(() => window.scrollTo(0, 0))

  const tabsBar = page.locator('.el-tabs__header').first()
  if (await tabsBar.count()) {
    const tabsWrap = tabsBar.locator('..').locator('..')
    await snapLocator(tabsWrap, 'scripts-tabs.png').catch(async () => {
      await snapLocator(tabsBar, 'scripts-tabs.png')
    })
  }
  await snap(page, 'scripts-overview.png', { fullPage: true })

  const toolbar = page.locator('.el-tab-pane:visible .flex.items-center.mb-12').first()
  if (await toolbar.count()) {
    await snapLocator(toolbar, 'scripts-external-toolbar.png')
  }

  const extTable = page.locator('.el-tab-pane:visible .el-table').first()
  if (await extTable.count()) {
    await snapLocator(extTable, 'scripts-external-table.png')
  }

  const settingsBtn = page.locator('.icon-a-setup').first()
  if (await settingsBtn.count()) {
    await settingsBtn.click()
    await snapDialog(page, 'scripts-settings-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  await page.getByRole('tab', { name: /内嵌|embedded/i }).click()
  await page.waitForTimeout(1500)
  const embTable = page.locator('.el-tab-pane:visible .el-table').first()
  if (await embTable.count()) {
    await snapLocator(embTable, 'scripts-embedded-table.png')
  }

  await page.getByRole('tab', { name: /群组|group/i }).click()
  await page.waitForTimeout(1500)
  const groupToolbar = page.locator('.el-tab-pane:visible .flex.items-center.mb-12').first()
  if (await groupToolbar.count()) {
    await snapLocator(groupToolbar, 'scripts-group-toolbar.png')
  }
  const groupTable = page.locator('.el-tab-pane:visible .el-table').first()
  if (await groupTable.count()) {
    await snapLocator(groupTable, 'scripts-group-table.png')
  }

  const newGroup = page.locator('[data-cy="new-group"]').first()
  if (await newGroup.count()) {
    await newGroup.click()
    await snapDialog(page, 'scripts-group-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  await page.goto(scriptsUrl('external'), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await waitScriptsExternal(page)
  const nameLink = page.locator('[data-cy="name"]').first()
  if (await nameLink.count()) {
    await nameLink.click()
    await page.waitForURL(/script\/edit/, { timeout: 30000 })
    await page.waitForTimeout(2000)
    const header = page.locator('.border-b.border-solid.border-line').first()
    if (await header.count()) {
      await snapLocator(header, 'scripts-edit-header.png')
    }
    await snap(page, 'scripts-edit-overview.png', { fullPage: false })
  } else {
    await page.goto(scriptEditUrl(), { waitUntil: 'networkidle', timeout: 90000 })
    await page.waitForTimeout(2000)
    const header = page.locator('.border-b.border-solid.border-line').first()
    if (await header.count()) {
      await snapLocator(header, 'scripts-edit-header.png')
    }
    await snap(page, 'scripts-edit-overview.png', { fullPage: false })
  }
}

function stylesUrl(tab = 'external') {
  return `${BASE}/_Admin/development/styles?SiteId=${SITE_ID}&name=${tab}`
}

function styleEditUrl(id) {
  const q = id ? `&id=${id}` : ''
  return `${BASE}/_Admin/development/style/edit?SiteId=${SITE_ID}${q}`
}

async function waitStylesExternal(page) {
  await page
    .waitForResponse(
      (r) => r.url().includes('Style') && r.status() === 200,
      { timeout: 60000 }
    )
    .catch(() => {})
  await page
    .locator('.el-table')
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => {})
  await page.waitForTimeout(1200)
}

async function captureStyles(page) {
  await page.goto(stylesUrl('external'), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await waitStylesExternal(page)
  await page.evaluate(() => window.scrollTo(0, 0))

  const tabsBar = page.locator('.el-tabs__header').first()
  if (await tabsBar.count()) {
    const tabsWrap = tabsBar.locator('..').locator('..')
    await snapLocator(tabsWrap, 'styles-tabs.png').catch(async () => {
      await snapLocator(tabsBar, 'styles-tabs.png')
    })
  }
  await snap(page, 'styles-overview.png', { fullPage: true })

  const toolbar = page.locator('.el-tab-pane:visible .flex.items-center.mb-12').first()
  if (await toolbar.count()) {
    await snapLocator(toolbar, 'styles-external-toolbar.png')
  }

  const extTable = page.locator('.el-tab-pane:visible .el-table').first()
  if (await extTable.count()) {
    await snapLocator(extTable, 'styles-external-table.png')
  }

  const settingsBtn = page.locator('.icon-a-setup').first()
  if (await settingsBtn.count()) {
    await settingsBtn.click()
    await snapDialog(page, 'styles-settings-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  await page.getByRole('tab', { name: /内嵌|embedded/i }).click()
  await page.waitForTimeout(1500)
  const embTable = page.locator('.el-tab-pane:visible .el-table').first()
  if (await embTable.count()) {
    await snapLocator(embTable, 'styles-embedded-table.png')
  }

  await page.getByRole('tab', { name: /行内|inline/i }).click()
  await page.waitForTimeout(1500)
  const inlineTable = page.locator('.el-tab-pane:visible .el-table').first()
  if (await inlineTable.count()) {
    await snapLocator(inlineTable, 'styles-inline-table.png')
  }
  const inlineName = page.locator('[data-cy="name"]').first()
  if (await inlineName.count()) {
    await inlineName.click()
    await snapDialog(page, 'styles-inline-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  await page.getByRole('tab', { name: /群组|group/i }).click()
  await page.waitForTimeout(1500)
  const groupToolbar = page.locator('.el-tab-pane:visible .flex.items-center.mb-12').first()
  if (await groupToolbar.count()) {
    await snapLocator(groupToolbar, 'styles-group-toolbar.png')
  }
  const groupTable = page.locator('.el-tab-pane:visible .el-table').first()
  if (await groupTable.count()) {
    await snapLocator(groupTable, 'styles-group-table.png')
  }
  const newGroup = page.locator('[data-cy="new-group"]').first()
  if (await newGroup.count()) {
    await newGroup.click()
    await snapDialog(page, 'styles-group-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  await page.goto(stylesUrl('external'), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await waitStylesExternal(page)
  const nameLink = page.locator('[data-cy="name"]').first()
  if (await nameLink.count()) {
    await nameLink.click()
    await page.waitForURL(/style\/edit/, { timeout: 30000 })
    await page.waitForTimeout(2000)
    const header = page.locator('.border-b.border-solid.border-line').first()
    if (await header.count()) {
      await snapLocator(header, 'styles-edit-header.png')
    }
    await snap(page, 'styles-edit-overview.png', { fullPage: false })
  } else {
    await page.goto(styleEditUrl(), { waitUntil: 'networkidle', timeout: 90000 })
    await page.waitForTimeout(2000)
    const header = page.locator('.border-b.border-solid.border-line').first()
    if (await header.count()) {
      await snapLocator(header, 'styles-edit-header.png')
    }
    await snap(page, 'styles-edit-overview.png', { fullPage: false })
  }
}

async function main() {
  const only = process.env.KOOBOO_SCREENSHOT_SCOPE || 'views'
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  await login(page)

  if (only === 'views') {
    await captureViews(page)
  }
  if (only === 'layouts') {
    await captureLayouts(page)
  }
  if (only === 'scripts') {
    await captureScripts(page)
  }
  if (only === 'styles') {
    await captureStyles(page)
  }

  await browser.close()
  console.log('done →', OUT_DIR)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
