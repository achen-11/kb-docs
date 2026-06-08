/**
 * Capture Kooboo admin CMS screenshots for docs/public/cms/settings/
 * Usage:
 *   KOOBOO_SCREENSHOT_SCOPE=basic node scripts/cms-settings-screenshots.mjs
 *   KOOBOO_SCREENSHOT_SCOPE=multilingual node scripts/cms-settings-screenshots.mjs
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

  await browser.close()
  console.log('done →', OUT_DIR)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
