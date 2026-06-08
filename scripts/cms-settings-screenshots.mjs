/**
 * Capture Kooboo admin CMS screenshots for docs/public/cms/settings/
 * Usage:
 *   KOOBOO_SCREENSHOT_SCOPE=basic node scripts/cms-settings-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=multilingual node scripts/cms-settings-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=domains node scripts/cms-settings-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=integrations node scripts/cms-settings-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=site-users node scripts/cms-settings-screenshots.mjs
 */
import './load-env.mjs'
import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const REPO_ROOT =
  process.env.KOOBOO_DOCS_ROOT ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(REPO_ROOT, 'docs/public/cms/settings')

const BASE = process.env.KOOBOO_BASE || 'https://www.redev.cn'
const SITE_ID =
  process.env.KOOBOO_SITE_ID || '552e81ab-eb2a-cb82-1458-aa61512cedd2'
const USER = process.env.KOOBOO_USER || 'wg-gmail'
const PASS = process.env.KOOBOO_PASS || ''

if (!PASS) {
  console.error('Set KOOBOO_PASS in the environment or kb-docs/.env')
  process.exit(1)
}

const BASIC_TABS = [
  ['basic', 'general'],
  ['access', 'access'],
  ['performance', 'performance'],
  ['seo', 'seo'],
  ['editor', 'editor'],
  ['advance', 'advanced'],
]

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

function settingsUrl(name) {
  const q = name ? `&name=${name}` : ''
  return `${BASE}/_Admin/system/settings?SiteId=${SITE_ID}${q}`
}

async function snap(page, name, options = {}) {
  const file = path.join(OUT_DIR, name)
  await page.screenshot({ path: file, fullPage: options.fullPage ?? true })
  console.log('saved', file)
}

async function snapLocator(locator, name) {
  await locator.scrollIntoViewIfNeeded()
  await locator.page().waitForTimeout(400)
  const file = path.join(OUT_DIR, name)
  await locator.screenshot({ path: file })
  console.log('saved', file)
}

async function ensureMultilingualExpanded(page) {
  const multiSwitch = page.locator('[data-cy="多语言"]').first()
  if (!(await multiSwitch.count())) return false

  const checked = await multiSwitch.evaluate((el) => {
    const root = el.closest('.el-switch')
    return root?.classList.contains('is-checked') ?? false
  })
  if (!checked) {
    await multiSwitch.click()
    await page.waitForTimeout(600)
  }
  return true
}

async function captureMultilingual(page) {
  await page.goto(settingsUrl('basic'), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await page.waitForTimeout(2000)

  if (!(await ensureMultilingualExpanded(page))) return

  const panel = page
    .locator('.bg-\\[\\#fafafa\\], .dark\\:bg-\\[\\#333\\]')
    .filter({ hasText: /默认语言|defaultLanguage/i })
    .first()

  if (await panel.count()) {
    const header = page
      .locator('.el-form-item')
      .filter({ has: page.locator('[data-cy="多语言"]') })
      .first()
    if (await header.count()) {
      await header.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      const box1 = await header.boundingBox()
      const box2 = await panel.boundingBox()
      if (box1 && box2) {
        const file = path.join(OUT_DIR, 'settings-basic-multilingual.png')
        await page.screenshot({
          path: file,
          clip: {
            x: Math.min(box1.x, box2.x),
            y: box1.y,
            width: Math.max(box1.width, box2.width),
            height: box2.y + box2.height - box1.y,
          },
        })
        console.log('saved', file)
        return
      }
    }
    await snapLocator(panel, 'settings-basic-multilingual.png')
  }
}

async function captureBasicSettings(page) {
  await page.goto(settingsUrl('basic'), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await page.waitForTimeout(2000)

  const tabs = page.locator('.el-tabs__header').first()
  if (await tabs.count()) {
    await snapLocator(tabs, 'settings-basic-tabs.png')
  }

  await captureMultilingual(page)

  for (const [name, file] of BASIC_TABS) {
    await page.goto(settingsUrl(name), {
      waitUntil: 'networkidle',
      timeout: 90000,
    })
    await page.waitForTimeout(1500)
    await page.evaluate(() => window.scrollTo(0, 0))
    await snap(page, `settings-basic-${file}.png`, { fullPage: true })
  }
}

async function snapDialog(page, name) {
  const dialog = page.locator('.el-dialog').last()
  await dialog.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(400)
  const file = path.join(OUT_DIR, name)
  await dialog.screenshot({ path: file })
  console.log('saved', file)
}

function domainsUrl() {
  return `${BASE}/_Admin/system/domains?SiteId=${SITE_ID}`
}

async function captureDomains(page) {
  await page.goto(domainsUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await page
    .waitForResponse(
      (r) => r.url().includes('Binding/listbysite') && r.status() === 200,
      { timeout: 60000 }
    )
    .catch(() => {})
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.scrollTo(0, 0))

  const toolbar = page.locator('[data-cy="new-binding"]').locator('..').first()
  if (await toolbar.count()) {
    await snapLocator(toolbar, 'settings-domains-toolbar.png')
  }
  const table = page.locator('.el-table').first()
  if (await table.count()) {
    await snapLocator(table, 'settings-domains-list.png')
  }
  await snap(page, 'settings-domains-overview.png', { fullPage: true })

  const newBtn = page.locator('[data-cy="new-binding"]').first()
  if (await newBtn.count()) {
    await newBtn.click()
    await page.waitForTimeout(600)
    await snapDialog(page, 'settings-domains-new-binding.png')

    const adv = page.locator('[data-cy="show-advance-settings"]').first()
    if (await adv.count()) {
      await adv.click()
      await page.waitForTimeout(400)
      await snapDialog(page, 'settings-domains-new-binding-advanced.png')
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }
}

function configUrl(group) {
  const q = group ? `&group=${encodeURIComponent(group)}` : ''
  return `${BASE}/_Admin/system/config?SiteId=${SITE_ID}${q}`
}

async function captureIntegrationGroup(page, group, file) {
  await page.goto(configUrl(group), { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1500)
  const panel = page.locator('.el-collapse-item').filter({ hasText: group }).first()
  if (await panel.count()) {
    await snapLocator(panel, `settings-integrations-${file}.png`)
  }
}

function siteUsersUrl() {
  return `${BASE}/_Admin/system/siteuser?SiteId=${SITE_ID}`
}

async function captureSiteUsers(page) {
  await page.goto(siteUsersUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await page
    .waitForResponse(
      (r) => r.url().includes('SiteUser/CurrentUsers') && r.status() === 200,
      { timeout: 60000 }
    )
    .catch(() => {})
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.scrollTo(0, 0))

  const toolbar = page.locator('[data-cy="add-user"]').locator('..').first()
  if (await toolbar.count()) {
    await snapLocator(toolbar, 'settings-site-users-toolbar.png')
  }
  const table = page.locator('.el-table').first()
  if (await table.count()) {
    await snapLocator(table, 'settings-site-users-list.png')
  }
  await snap(page, 'settings-site-users-overview.png', { fullPage: true })

  const addBtn = page.locator('[data-cy="add-user"]').first()
  if (await addBtn.count()) {
    await addBtn.click()
    await page.waitForTimeout(600)
    await snapDialog(page, 'settings-site-users-add-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }
}

async function captureIntegrations(page) {
  await page.goto(configUrl(), { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(2000)
  await snap(page, 'settings-integrations-overview.png', { fullPage: true })

  const groups = [
    ['Database', 'database'],
    ['SMS', 'sms'],
    ['OAuth2', 'oauth2'],
    ['Storage', 'storage'],
    ['Others', 'others'],
  ]
  for (const [group, file] of groups) {
    await captureIntegrationGroup(page, group, file)
  }
  // Payment: use manually masked screenshot (settings-integrations-payment.png)

  await page.goto(configUrl('Database'), {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await page.waitForTimeout(1200)
  const editMysql = page.locator('[data-cy="Mysql"]').first()
  if (!(await editMysql.count())) {
    const editSqlite = page.locator('[data-cy="Sqlite"]').first()
    if (await editSqlite.count()) await editSqlite.click()
  } else {
    await editMysql.click()
  }
  if (await page.locator('.el-dialog').count()) {
    await snapDialog(page, 'settings-integrations-edit-dialog.png')
    await page.keyboard.press('Escape')
  }
}

async function main() {
  const only = process.env.KOOBOO_SCREENSHOT_SCOPE || 'basic'
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()
  await login(page)

  if (only === 'basic') {
    await captureBasicSettings(page)
  }
  if (only === 'multilingual') {
    await captureMultilingual(page)
  }
  if (only === 'domains') {
    await captureDomains(page)
  }
  if (only === 'integrations') {
    await captureIntegrations(page)
  }
  if (only === 'site-users') {
    await captureSiteUsers(page)
  }

  await browser.close()
  console.log('done →', OUT_DIR)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
