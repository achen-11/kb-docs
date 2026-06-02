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

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(REPO_ROOT, 'docs/public/cms/site')

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

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()

  await login(page)

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

  await browser.close()
  console.log('done:', shots.length, 'files')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
