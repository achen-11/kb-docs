/**
 * Capture Kooboo admin CMS screenshots for docs/public/cms/commerce/
 * Usage: node scripts/cms-commerce-screenshots.mjs
 *
 * Optional env:
 *   KOOBOO_PRODUCT_ID — edit page product id (default: extfield test product)
 *   KOOBOO_BASE, KOOBOO_SITE_ID, KOOBOO_USER, KOOBOO_PASS
 */
import './load-env.mjs'
import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const REPO_ROOT =
  process.env.KOOBOO_DOCS_ROOT ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(REPO_ROOT, 'docs/public/cms/commerce')

const BASE = process.env.KOOBOO_BASE || 'https://www.redev.cn'
const SITE_ID =
  process.env.KOOBOO_SITE_ID || '552e81ab-eb2a-cb82-1458-aa61512cedd2'
const PRODUCT_ID =
  process.env.KOOBOO_PRODUCT_ID || '17da841b2ac74c3496c5a1202a0e3e93'
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

async function snap(page, name) {
  const file = path.join(OUT_DIR, name)
  await page.screenshot({ path: file, fullPage: false })
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

function variantCard(page) {
  return page.locator('.rounded-normal.bg-fff').filter({ hasText: '规格选项' })
}

async function snapBasicSection(page) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  const basic = page
    .locator('.px-24.pt-0')
    .locator('> *')
    .first()
  if (await basic.count()) {
    await snapLocator(basic, 'product-management-detail-basic.png')
    return
  }
  await snap(page, 'product-management-detail-basic.png')
}

async function snapVariantSections(page) {
  const card = variantCard(page)
  await card.scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)

  const optionsItem = card.locator('.el-form-item').filter({ hasText: '规格选项' })
  if (await optionsItem.count()) {
    await snapLocator(optionsItem, 'product-management-detail-variant-options.png')
  }

  const table = card.locator('.el-table').first()
  if (await table.count()) {
    await snapLocator(table, 'product-management-detail-variants.png')
  }
}

async function ensureOptionGroup(page) {
  const addVariant = page.getByRole('button', { name: /添加变体|添加规格/ })
  if (await addVariant.count()) return

  const card = variantCard(page)
  const addGroup = card.locator('button.is-circle.text-blue').last()
  await addGroup.click()
  await page.waitForTimeout(800)

  const nameInput = card
    .locator('.el-card input')
    .filter({ hasNot: page.locator('[type="number"]') })
    .first()
  await nameInput.fill('颜色')
  await nameInput.press('Tab')
  await page.waitForTimeout(300)

  const valueInput = card
    .getByPlaceholder(/添加.*值|添加值|add.*value/i)
    .first()
  if (await valueInput.count()) {
    await valueInput.fill('红')
    await valueInput.press('Enter')
    await page.waitForTimeout(500)
  }

  const done = card.getByRole('button', { name: /完成/ }).first()
  if (await done.count()) {
    await done.click()
    await page.waitForTimeout(1500)
  }
}

async function captureEditVariantDialog(page) {
  const editIcon = page.locator('.el-table .icon-a-writein').first()
  await editIcon.waitFor({ state: 'visible', timeout: 30000 })
  await editIcon.click()
  await snapDialog(page, 'product-management-detail-variant-dialog.png')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
}

async function captureCreateVariantDialog(page) {
  try {
    await ensureOptionGroup(page)
    const addVariant = page.getByRole('button', { name: /添加变体|添加规格/ })
    await addVariant.waitFor({ state: 'visible', timeout: 20000 })
    await addVariant.click()
    await snapDialog(page, 'product-management-detail-variant-create-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  } catch (e) {
    console.warn(
      'skip product-management-detail-variant-create-dialog.png:',
      '「添加规格」未出现（需先有选项组且变体带规格值）。',
      '可用 Browser MCP 手动补图，或换 KOOBOO_PRODUCT_ID。'
    )
  }
}

async function captureShippings(page) {
  const url = `${BASE}/_Admin/commerce/shippings?SiteId=${SITE_ID}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'shippings-express-list.png')

  const digitalTab = page.getByRole('tab', { name: /数字产品/ })
  if (await digitalTab.count()) {
    await digitalTab.click()
    await page.waitForTimeout(2000)
    await snap(page, 'shippings-digital-list.png')
  }

  await page.getByRole('tab', { name: /实体产品/ }).click().catch(() => {})
  await page.waitForTimeout(800)

  const editLink = page.locator('a .icon-a-writein').first()
  if (await editLink.count()) {
    await editLink.click()
    await page.waitForURL(/shippings\/edit/, { timeout: 60000 })
    await page.waitForTimeout(2000)
    await snap(page, 'shippings-express-edit.png')
    await page.goBack({ waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(1000)
  }

  if (await digitalTab.count()) {
    await digitalTab.click()
    await page.waitForTimeout(1500)
    const digitalEdit = page.locator('a .icon-a-writein').first()
    if (await digitalEdit.count()) {
      await digitalEdit.click()
      await page.waitForURL(/digital-shippings\/edit/, { timeout: 60000 })
      await page.waitForTimeout(2000)
      await snap(page, 'shippings-digital-edit.png')
    }
  }
}

async function captureCommerceSettings(page) {
  const url = `${BASE}/_Admin/commerce/settings?SiteId=${SITE_ID}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await page.evaluate(() => window.scrollTo(0, 0))
  await snap(page, 'commerce-settings-overview.png')

  const cards = page.locator('.rounded-normal.bg-fff')
  if ((await cards.count()) >= 2) {
    await cards.nth(1).scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await snapLocator(cards.nth(1), 'commerce-settings-custom-fields.png')
  }
  if ((await cards.count()) >= 3) {
    await cards.nth(2).scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await snapLocator(cards.nth(2), 'commerce-settings-display.png')
  }

  const addBtn = page
    .locator('.rounded-normal.bg-fff')
    .nth(1)
    .locator('button')
    .filter({ has: page.locator('.icon-a-addto') })
    .first()
  if (await addBtn.count()) {
    await addBtn.click()
    await snapDialog(page, 'commerce-settings-custom-field-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }
}

async function captureProductCategories(page) {
  const listUrl = `${BASE}/_Admin/commerce/product-categories?SiteId=${SITE_ID}`
  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'product-categories-list.png')

  const createUrl = `${BASE}/_Admin/commerce/product-categories/create?SiteId=${SITE_ID}`
  await page.goto(createUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)
  await snap(page, 'product-categories-create.png')

  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)
  const editLink = page.locator('a .icon-a-writein').first()
  if (await editLink.count()) {
    await editLink.click()
    await page.waitForURL(/product-categories\/edit/, { timeout: 60000 })
    await page.waitForTimeout(2000)
    await snap(page, 'product-categories-edit.png')
    await page.goBack({ waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(1500)
  }

  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)
  try {
    const countTag = page
      .locator('tbody tr')
      .first()
      .locator('.el-tag.cursor-pointer')
    await countTag.scrollIntoViewIfNeeded()
    await countTag.click({ force: true, timeout: 15000 })
    await snapDialog(page, 'product-categories-products-dialog.png')
    await page.keyboard.press('Escape')
  } catch {
    console.warn(
      'skip product-categories-products-dialog.png: 商品数标签不可点或未显示'
    )
  }
}

async function captureProductTypes(page) {
  const typesUrl = `${BASE}/_Admin/commerce/product-types?SiteId=${SITE_ID}`
  await page.goto(typesUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'product-types-list.png')

  const createBtn = page.locator('button').filter({
    has: page.locator('.icon-a-addto'),
  }).first()
  await createBtn.waitFor({ state: 'visible', timeout: 30000 })
  await createBtn.click()
  await snapDialog(page, 'product-types-create-dialog.png')

  const dialog = page.locator('.el-dialog').last()
  await dialog.locator('input').first().fill('Doc 示例类型')
  await dialog.getByRole('button', { name: /保存|确定|confirm/i }).click()
  await page.waitForTimeout(2000)

  const row = page.locator('tbody tr').first()
  await row.hover()
  await page.waitForTimeout(400)
  await row.locator('.icon-a-writein').click()
  await snapDialog(page, 'product-types-edit-dialog.png')
  await page.keyboard.press('Escape')
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

  if (!only || only === 'product-management') {
    const listUrl = `${BASE}/_Admin/commerce/product-management?SiteId=${SITE_ID}`
    await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(3000)
    await snap(page, 'product-management-list.png')

    const editUrl = `${BASE}/_Admin/commerce/product-management/edit?id=${PRODUCT_ID}&SiteId=${SITE_ID}`
    await page.goto(editUrl, { waitUntil: 'networkidle', timeout: 60000 })
    await page.getByRole('button', { name: /保存并返回/ }).waitFor({
      state: 'visible',
      timeout: 60000,
    })
    await page.waitForTimeout(2500)

    await snapBasicSection(page)
    await snapVariantSections(page)
    await captureEditVariantDialog(page)
    await captureCreateVariantDialog(page)
  }

  if (!only || only === 'product-types') {
    await captureProductTypes(page)
  }

  if (!only || only === 'product-categories') {
    await captureProductCategories(page)
  }

  if (!only || only === 'settings') {
    await captureCommerceSettings(page)
  }

  if (!only || only === 'shippings') {
    await captureShippings(page)
  }

  await browser.close()
  console.log('done →', OUT_DIR)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
