/**
 * Capture Kooboo admin CMS screenshots for docs/public/cms/site/
 * Usage: node scripts/cms-screenshots.mjs
 * Credentials: KOOBOO_PASS in env or kb-docs/.env (see load-env.mjs)
 */
import './load-env.mjs'
import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  applyCmsUiLanguage,
  getCmsBrowserContextOptions,
  restoreCmsUiLanguage,
  resolveCmsScreenshotOutputDir,
} from './cms-screenshot-locale.mjs'

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOC_LOCALE = process.env.KOOBOO_DOC_LOCALE || 'zh'
const OUT_DIR = resolveCmsScreenshotOutputDir(REPO_ROOT, 'site', DOC_LOCALE)
const CMS_PUBLIC_ROOT = path.dirname(OUT_DIR)

const BASE = 'https://www.redev.cn'
const SITE_ID = '552e81ab-eb2a-cb82-1458-aa61512cedd2'
const USER = process.env.KOOBOO_USER || 'wg-gmail'
const PASS = process.env.KOOBOO_PASS || ''

if (!PASS) {
  console.error('Set KOOBOO_PASS in the environment or kb-docs/.env')
  process.exit(1)
}

const shots = []

async function login(page) {
  await page.goto(`${BASE}/_Admin/login`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1500)
  await snapRelative(page, 'getting-started/01-login.png')
  const userInput = page.locator('input').filter({ hasNot: page.locator('[type="password"]') }).first()
  const passInput = page.locator('input[type="password"]').first()
  await userInput.fill(USER)
  await passInput.fill(PASS)
  const loginBtn = page.getByRole('button', { name: /登录|login/i }).first()
  if (await loginBtn.count()) {
    await loginBtn.click()
  } else {
    await page.locator('button').filter({ hasText: /登录/ }).first().click()
  }
  await page.waitForURL(/\/_Admin\/(?!login)/, { timeout: 60000 })
  await page.waitForTimeout(2000)
}

async function snap(page, name) {
  const file = path.join(OUT_DIR, name)
  await page.screenshot({ path: file, fullPage: false })
  shots.push(file)
  console.log('saved', file)
}

async function snapRelative(page, relativePath, options = {}) {
  const file = path.join(CMS_PUBLIC_ROOT, relativePath)
  await mkdir(path.dirname(file), { recursive: true })
  await page.screenshot({ path: file, fullPage: options.fullPage ?? true })
  shots.push(file)
  console.log('saved', file)
}

async function captureGettingStarted(page) {
  const siteListUrl = `${BASE}/_Admin/`
  await page.goto(siteListUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)
  await snapRelative(page, 'getting-started/站点列表.png')

  const folderLink = page.locator('a[href*="currentFolder="]').first()
  if (await folderLink.count()) {
    await folderLink.click()
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
    await page.waitForTimeout(1500)
  }
  await snapRelative(page, 'getting-started/02-site-list-folders.png')

  await page.goto(`${BASE}/_Admin/create`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)
  await snapRelative(page, 'getting-started/04-create-site-nav.png')

  await page.goto(`${BASE}/_Admin/create/import`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)
  await snapRelative(page, 'getting-started/导入站点.png')

  await page.goto(`${BASE}/_Admin/create/clone`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)
  await snapRelative(page, 'getting-started/克隆站点.png')
}

async function captureDashboardAndMedia(page) {
  const dashboardUrl = `${BASE}/_Admin/site?SiteId=${SITE_ID}`
  await page.goto(dashboardUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snapRelative(page, 'getting-started/03-enter-site.png')
  await snapRelative(page, 'site/dashboard.png')

  const mediaUrl = `${BASE}/_Admin/site/media?SiteId=${SITE_ID}`
  await page.goto(mediaUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snapRelative(page, 'site/media-library.png')

  const uploadBtn = page.locator('[data-cy="upload"]').first()
  if (await uploadBtn.count()) {
    await uploadBtn.click().catch(() => {})
    await page.waitForTimeout(800)
  }
  await snapRelative(page, 'site/media-upload.png')
}

async function captureNavigationEditMenu(page) {
  const dashboardUrl = `${BASE}/_Admin/site?SiteId=${SITE_ID}`
  await page.goto(dashboardUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)

  const editMenu = page.getByText(/Edit Menu|编辑菜单/i).first()
  if (await editMenu.count()) {
    await editMenu.click()
    await page.waitForTimeout(800)
  }
  await snapRelative(page, 'navigation-edit-menu.png')
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    ...getCmsBrowserContextOptions(DOC_LOCALE),
  })
  const page = await context.newPage()
  let previousLanguage = null

  try {
    await login(page)
    previousLanguage = await applyCmsUiLanguage(page, context, BASE, DOC_LOCALE)
    await captureGettingStarted(page)
    await captureDashboardAndMedia(page)
    await captureNavigationEditMenu(page)

    const pagesUrl = `${BASE}/_Admin/site/pages?SiteId=${SITE_ID}`
    await page.goto(pagesUrl, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(3000)
    await snap(page, 'pages-list.png')

    const settingLink = page.locator('[data-cy="setting"]').first()
    await settingLink.waitFor({ state: 'visible', timeout: 30000 })
    await settingLink.click()
    await page.waitForURL(/page\/(layout-)?setting/, { timeout: 60000 })
    await page.waitForTimeout(3000)
    await snap(page, 'pages-setting.png')

    await page.goto(pagesUrl, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(2000)
    const editLink = page.locator('[data-cy="edit-code"]').first()
    await editLink.click()
    await page.waitForURL(/page\/(layout-)?edit/, { timeout: 60000 })
    await page.waitForTimeout(4000)
    await snap(page, 'pages-edit-code.png')

    await page.goto(pagesUrl, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(2000)
    const inline = page.locator('[data-cy="inline-editor"]').first()
    const popupPromise = context.waitForEvent('page', { timeout: 15000 }).catch(() => null)
    await inline.click()
    const popup = await popupPromise
    const inlinePage = popup || page
    await inlinePage.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
    await inlinePage.waitForTimeout(5000)
    await snap(inlinePage, 'pages-inline-edit.png')
    if (popup) await popup.close()
  } finally {
    await restoreCmsUiLanguage(page, context, BASE, previousLanguage).catch((error) => {
      console.warn('restore cms language failed:', error)
    })
    await browser.close()
  }
  console.log('done:', shots.length, 'files')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
