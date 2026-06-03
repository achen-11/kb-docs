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

async function snap(page, name, options = {}) {
  const { fullPage = false } = options
  const file = path.join(OUT_DIR, name)
  await page.screenshot({ path: file, fullPage })
  console.log('saved', file)
}

async function waitNotificationOverviewReady(page) {
  await page.waitForSelector('.el-form', { state: 'visible', timeout: 60000 })
  await Promise.all([
    page
      .waitForResponse(
        (r) => r.url().includes('EmailEvents') && r.status() === 200,
        { timeout: 60000 }
      )
      .catch(() => null),
    page
      .waitForResponse(
        (r) => r.url().includes('WebhookEvents') && r.status() === 200,
        { timeout: 60000 }
      )
      .catch(() => null),
  ])
  await page
    .waitForFunction(
      () => {
        const items = document.querySelectorAll('[data-cy=added-item]')
        if (items.length >= 1) return true
        const addBtns = document.querySelectorAll('[data-cy=add]')
        return addBtns.length >= 2
      },
      { timeout: 30000 }
    )
    .catch(() => {})
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(1200)
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

async function captureNotificationOverview(page) {
  const url = `${BASE}/_Admin/commerce/notification?SiteId=${SITE_ID}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await waitNotificationOverviewReady(page)
  await snap(page, 'notification-overview.png', { fullPage: true })
}

async function captureNotification(page, overviewOnly = false) {
  const url = `${BASE}/_Admin/commerce/notification?SiteId=${SITE_ID}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await waitNotificationOverviewReady(page)
  await snap(page, 'notification-overview.png', { fullPage: true })
  if (overviewOnly) return

  const emailAdd = page.locator('[data-cy=add]').first()
  if (await emailAdd.count()) {
    await emailAdd.click()
    await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
    const eventSelect = page.locator('.el-dialog .el-select').first()
    if (await eventSelect.count()) {
      await eventSelect.click()
      await page.locator('.el-select-dropdown:visible .el-select-dropdown__item').first().click()
      await page.waitForTimeout(800)
    }
    await snapDialog(page, 'notification-email-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  const koobooRadio = page.locator('.el-radio-button').filter({ hasText: /^Kooboo$/ })
  const customRadio = page.locator('.el-radio-button').filter({ hasText: /自定义/ })
  if (await customRadio.count()) {
    await customRadio.click()
    await page.waitForTimeout(400)
    const smtpBtn = page.getByRole('button', { name: /设置服务器|服务器信息/ }).first()
    if (await smtpBtn.count()) {
      await smtpBtn.click()
      await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
      await page.waitForTimeout(500)
      await snapDialog(page, 'notification-smtp-dialog.png')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    }
    if (await koobooRadio.count()) await koobooRadio.click()
  } else {
    console.warn('skip notification-smtp-dialog.png: 未找到自定义邮件服务器选项')
  }

  const emailLog = page.getByRole('button', { name: /^日志$/ }).first()
  if (await emailLog.count()) {
    await emailLog.click()
    await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(1000)
    await snapDialog(page, 'notification-email-log-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  const webhookAdd = page.locator('[data-cy=add]').nth(1)
  if (await webhookAdd.count()) {
    await webhookAdd.click()
    await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(500)
    await snapDialog(page, 'notification-webhook-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  const webhookLog = page.getByRole('button', { name: /^日志$/ }).nth(1)
  if (await webhookLog.count()) {
    await webhookLog.click()
    await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(1000)
    await snapDialog(page, 'notification-webhook-log-dialog.png')
    await page.keyboard.press('Escape')
  }
}

async function captureLoyalty(page) {
  const base = `${BASE}/_Admin/commerce/loyalty?SiteId=${SITE_ID}`

  await page.goto(`${base}&name=membership`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'loyalty-membership.png')

  const createMembership = page
    .locator('button:not([disabled])')
    .filter({ has: page.locator('.icon-a-addto') })
    .first()
  if (await createMembership.count()) {
    await createMembership.click()
    await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(500)
    await snapDialog(page, 'loyalty-membership-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  await page.goto(`${base}&name=member`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)
  await snap(page, 'loyalty-members.png')

  const detailIcon = page.locator('.el-table .icon-eyes').first()
  if (await detailIcon.count()) {
    await detailIcon.click()
    await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(800)
    await snapDialog(page, 'loyalty-member-detail-dialog.png')
    await page.keyboard.press('Escape')
  }

  await page.goto(`${base}&name=earnPointsConfig`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.waitForTimeout(2000)
  await snap(page, 'loyalty-earn-points.png')

  await page.goto(`${base}&name=redeemPointsConfig`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.waitForTimeout(2000)
  await snap(page, 'loyalty-redeem-points.png')
}

async function captureTaxes(page) {
  const listUrl = `${BASE}/_Admin/commerce/taxes?SiteId=${SITE_ID}`
  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'taxes-list.png')

  const createBtn = page
    .locator('button:not([disabled])')
    .filter({ has: page.locator('.icon-a-addto') })
    .first()
  if (await createBtn.count()) {
    await createBtn.click()
    await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(500)
    await snapDialog(page, 'taxes-select-country-dialog.png')

    const countryRow = page.locator('.el-dialog tbody tr').first()
    if (await countryRow.count()) {
      await countryRow.click()
      await page.waitForURL(/taxes\/create/, { timeout: 60000 })
      await page.waitForTimeout(2000)
      await snap(page, 'taxes-edit.png')
      return
    }
    await page.keyboard.press('Escape')
  } else {
    console.warn(
      'skip taxes-select-country-dialog.png: 创建按钮无权限，改用已有规则或直链 create'
    )
  }

  const editLink = page.locator('a .icon-a-writein').first()
  if (await editLink.count()) {
    await editLink.click()
    await page.waitForURL(/taxes\/edit/, { timeout: 60000 })
    await page.waitForTimeout(2000)
    await snap(page, 'taxes-edit.png')
    return
  }

  for (const country of ['China', 'United States', 'Germany']) {
    const createUrl = `${BASE}/_Admin/commerce/taxes/create?SiteId=${SITE_ID}&country=${encodeURIComponent(country)}`
    await page.goto(createUrl, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(1500)
    const baseTax = page.locator('.el-input-number').first()
    if (await baseTax.count()) {
      await snap(page, 'taxes-edit.png')
      return
    }
  }
  console.warn('skip taxes-edit.png: 列表无规则且 create 直链不可用')
}

async function captureCurrencies(page) {
  const url = `${BASE}/_Admin/commerce/currencies?SiteId=${SITE_ID}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'currencies-list.png')

  const editIcon = page.locator('.el-table .icon-a-writein').first()
  if (await editIcon.count()) {
    await editIcon.click()
  } else {
    const addBtn = page.getByRole('button', { name: /添加货币/ }).first()
    if (await addBtn.count()) {
      await addBtn.click()
      await page.waitForTimeout(600)
      const item = page.locator('.el-dropdown-menu:visible .el-dropdown-menu__item').first()
      if (await item.count()) {
        await item.click({ force: true })
      } else {
        console.warn('skip currencies-edit-dialog.png: 无可添加货币')
        return
      }
    } else {
      console.warn('skip currencies-edit-dialog.png: 无编辑权限或空列表')
      return
    }
  }
  await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(500)
  await snapDialog(page, 'currencies-edit-dialog.png')
  await page.keyboard.press('Escape')
}

async function captureOrders(page) {
  const listUrl = `${BASE}/_Admin/commerce/orders?SiteId=${SITE_ID}`
  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'orders-list.png')

  const orderId = process.env.KOOBOO_ORDER_ID
  if (orderId) {
    const detailUrl = `${BASE}/_Admin/commerce/order-detail?SiteId=${SITE_ID}&id=${orderId}`
    await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 60000 })
  } else {
    const detailIcon = page.locator('.el-table .icon-eyes').first()
    if (!(await detailIcon.count())) {
      console.warn('skip orders detail/dialogs: 列表无订单，可设置 KOOBOO_ORDER_ID')
      return
    }
    await detailIcon.click()
    await page.waitForURL(/order-detail/, { timeout: 60000 })
  }
  await page.waitForTimeout(2000)
  await snap(page, 'orders-detail.png')

  const payBtn = page.getByRole('button', { name: /^付款$|^支付$|^Pay$/i }).first()
  if (await payBtn.count()) {
    await payBtn.click()
    await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(500)
    await snapDialog(page, 'orders-payment-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  async function snapDeliveryIfPossible() {
    const deliverBtn = page.locator('button').filter({ hasText: /^发货$/ }).first()
    if (!(await deliverBtn.count())) return false
    await deliverBtn.click()
    await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(500)
    await snapDialog(page, 'orders-delivery-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    return true
  }

  let deliveryCaptured = await snapDeliveryIfPossible()
  if (!deliveryCaptured && !orderId) {
    await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(1000)
    const eyes = page.locator('.el-table .icon-eyes')
    const n = Math.min(await eyes.count(), 8)
    for (let i = 1; i < n; i++) {
      await eyes.nth(i).click()
      await page.waitForURL(/order-detail/, { timeout: 60000 })
      await page.waitForTimeout(1500)
      deliveryCaptured = await snapDeliveryIfPossible()
      if (deliveryCaptured) break
      await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForTimeout(800)
    }
  }
  if (!deliveryCaptured) {
    console.warn(
      'skip orders-delivery-dialog.png: 未找到可发货订单，可设置 KOOBOO_ORDER_ID 为已付款未发完订单'
    )
  }

  const cancelBtn = page.getByRole('button', { name: /^取消$/ }).first()
  if (await cancelBtn.count()) {
    await cancelBtn.click()
    await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(500)
    await snapDialog(page, 'orders-cancel-dialog.png')
    await page.keyboard.press('Escape')
  } else {
    console.warn('skip orders-cancel-dialog.png: 订单已取消或无取消按钮')
  }
}

async function captureDiscounts(page) {
  const listUrl = `${BASE}/_Admin/commerce/discounts?SiteId=${SITE_ID}`
  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'discounts-list.png')

  const createUrl = `${BASE}/_Admin/commerce/discounts/create?SiteId=${SITE_ID}`
  await page.goto(createUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)
  await snap(page, 'discounts-edit.png')

  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1500)

  const ordersIcon = page.locator('.el-table .icon-gaojisousuo1').first()
  if (await ordersIcon.count()) {
    await ordersIcon.click()
    await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(800)
    await snapDialog(page, 'discounts-orders-dialog.png')
    await page.keyboard.press('Escape')
  } else {
    console.warn('skip discounts-orders-dialog.png: 列表无折扣规则')
  }
}

async function captureCarts(page) {
  const listUrl = `${BASE}/_Admin/commerce/carts?SiteId=${SITE_ID}`
  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'carts-list.png')

  const createUrl = `${BASE}/_Admin/commerce/cart/create?SiteId=${SITE_ID}`
  await page.goto(createUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)
  await snap(page, 'carts-create.png')

  const addProduct = page.getByRole('button', { name: /添加商品/ })
  if (await addProduct.count()) {
    await addProduct.click()
    await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(500)
    await snapDialog(page, 'carts-select-variant-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1500)

  const cartId = process.env.KOOBOO_CART_ID
  if (cartId) {
    const editUrl = `${BASE}/_Admin/commerce/cart/edit?SiteId=${SITE_ID}&id=${cartId}`
    await page.goto(editUrl, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(2000)
    await snap(page, 'carts-edit.png')

    const checkoutUrl = `${BASE}/_Admin/commerce/cart/checkout?SiteId=${SITE_ID}&id=${cartId}`
    await page.goto(checkoutUrl, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(2000)
    await snap(page, 'carts-checkout.png')
    return
  }

  const editIcon = page.locator('.el-table .icon-a-writein').first()
  if (await editIcon.count()) {
    await editIcon.click()
    await page.waitForURL(/cart\/edit/, { timeout: 60000 })
    await page.waitForTimeout(2000)
    await snap(page, 'carts-edit.png')

    const idFromUrl = new URL(page.url()).searchParams.get('id')
    if (idFromUrl) {
      const checkoutUrl = `${BASE}/_Admin/commerce/cart/checkout?SiteId=${SITE_ID}&id=${idFromUrl}`
      await page.goto(checkoutUrl, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForTimeout(2000)
      await snap(page, 'carts-checkout.png')
    }
  } else {
    console.warn('skip carts-edit.png / carts-checkout.png: 列表无购物车，可设置 KOOBOO_CART_ID')
  }
}

async function captureCustomers(page) {
  const url = `${BASE}/_Admin/commerce/customers?SiteId=${SITE_ID}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'customers-list.png')

  const editIcon = page.locator('.el-table .icon-a-writein').first()
  if (await editIcon.count()) {
    await editIcon.click()
    await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(800)
    await snapDialog(page, 'customers-edit-dialog.png')

    const addAddr = page
      .locator('.el-dialog')
      .last()
      .getByRole('button', { name: /添加地址/ })
    if (await addAddr.count()) {
      await addAddr.click()
      await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
      await page.waitForTimeout(500)
      await snapDialog(page, 'customers-address-dialog.png')
      await page.keyboard.press('Escape')
    }
    await page.keyboard.press('Escape')
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

  if (!only || only === 'customers') {
    await captureCustomers(page)
  }

  if (!only || only === 'carts') {
    await captureCarts(page)
  }

  if (!only || only === 'discounts') {
    await captureDiscounts(page)
  }

  if (!only || only === 'orders') {
    await captureOrders(page)
  }

  if (!only || only === 'currencies') {
    await captureCurrencies(page)
  }

  if (!only || only === 'taxes') {
    await captureTaxes(page)
  }

  if (!only || only === 'loyalty') {
    await captureLoyalty(page)
  }

  if (!only || only === 'notification') {
    await captureNotification(page)
  }

  if (only === 'notification-overview') {
    await captureNotificationOverview(page)
  }

  await browser.close()
  console.log('done →', OUT_DIR)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
