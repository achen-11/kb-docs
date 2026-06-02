/**
 * Capture Kooboo admin CMS screenshots for docs/public/cms/content/
 * Usage: KOOBOO_PASS=... node scripts/cms-content-screenshots.mjs
 *
 * 若本机 Playwright 浏览器未安装，可改用 cdp-bridge MCP：
 * 1. 在 Chrome 登录 redev 后台并打开目标页
 * 2. browser_batch → Page.captureScreenshot
 * 3. node scripts/extract-cdp-batch-png.mjs <batch-json.txt> <filename.png>
 */
import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const REPO_ROOT =
  process.env.KOOBOO_DOCS_ROOT ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(REPO_ROOT, 'docs/public/cms/content')

const BASE = 'https://www.redev.cn'
const SITE_ID = '552e81ab-eb2a-cb82-1458-aa61512cedd2'
const USER = process.env.KOOBOO_USER || 'wg-gmail'
const PASS = process.env.KOOBOO_PASS || ''

if (!PASS) {
  console.error('Set KOOBOO_PASS')
  process.exit(1)
}

async function login(page) {
  await page.goto(`${BASE}/_Admin/login`, { waitUntil: 'networkidle', timeout: 60000 })
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

async function snapDialog(page, name) {
  const dialog = page.locator('.el-dialog').last()
  await dialog.waitFor({ state: 'visible', timeout: 30000 })
  const file = path.join(OUT_DIR, name)
  await dialog.screenshot({ path: file })
  console.log('saved', file)
}

async function clickFieldTab(page, label) {
  await page.locator('.el-dialog .el-tabs__item').filter({ hasText: label }).click()
  await page.waitForTimeout(600)
}

async function openFieldEditor(page) {
  await page.locator('[data-cy="new-field"]').click()
  await page.locator('[data-cy="field-name-input"]').waitFor({
    state: 'visible',
    timeout: 30000,
  })
  await page.waitForTimeout(800)
}

async function closeFieldEditor(page) {
  const cancel = page.locator('.el-dialog').last().getByRole('button', {
    name: /取消|cancel/i,
  })
  if (await cancel.count()) await cancel.first().click()
  else await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
}

async function captureFolderSettings(page) {
  const contentsUrl = `${BASE}/_Admin/content/contents?SiteId=${SITE_ID}`
  await page.goto(contentsUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)
  const row = page.locator('tbody tr').first()
  await row.hover()
  await page.waitForTimeout(400)
  const setting = row.locator('[data-cy="setting"]')
  await setting.waitFor({ state: 'visible', timeout: 15000 })
  await setting.click()
  await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(800)
  await snapDialog(page, 'contents-folder-settings-basic.png')
  await clickFieldTab(page, '关联数据')
  await snapDialog(page, 'contents-folder-settings-relation.png')
  await clickFieldTab(page, '字段')
  await snapDialog(page, 'contents-folder-settings-fields.png')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
}

async function captureFieldEditor(page) {
  await openFieldEditor(page)
  await snapDialog(page, 'field-editor-basic.png')

  await page.locator('[data-cy="control-type-dropdown"]').click()
  await page.locator('[data-cy="control-type-opt"]').filter({ hasText: '选择框' }).click()
  await page.waitForTimeout(600)
  await snapDialog(page, 'field-editor-selection-fixed.png')

  await page.locator('[data-cy="dynamic-options"]').check()
  await page.waitForTimeout(1500)
  await snapDialog(page, 'field-editor-dynamic-options.png')

  await closeFieldEditor(page)

  await openFieldEditor(page)
  await clickFieldTab(page, '高级')
  await snapDialog(page, 'field-editor-advanced.png')
  await closeFieldEditor(page)

  await openFieldEditor(page)
  await clickFieldTab(page, '验证')
  await page.locator('[data-cy="validation-rules-dropdown"]').waitFor({
    state: 'visible',
    timeout: 15000,
  })
  await page.locator('[data-cy="add-validation"]').click()
  await page.waitForTimeout(500)
  await snapDialog(page, 'field-editor-validation.png')
  await closeFieldEditor(page)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  await login(page)

  const typesUrl = `${BASE}/_Admin/content/contentTypes?SiteId=${SITE_ID}`
  await page.goto(typesUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'content-types-list.png')

  const typeEdit = page.locator('[data-cy="edit"]').first()
  const typeCreate = page.locator('[data-cy="create"]')
  if (await typeEdit.count()) {
    await typeEdit.click()
  } else {
    await typeCreate.click()
  }
  await page.waitForURL(/contentType/, { timeout: 60000 })
  await page.waitForTimeout(3000)
  await snap(page, 'content-type-fields.png')

  await captureFieldEditor(page)

  await captureFolderSettings(page)

  const contentsUrl = `${BASE}/_Admin/content/contents?SiteId=${SITE_ID}`
  await page.goto(contentsUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'contents-folders.png')

  const folderLink = page.locator('[data-cy="name"]').first()
  await folderLink.waitFor({ state: 'visible', timeout: 30000 })
  await folderLink.click()
  await page.waitForURL(/textContentsByFolder|\/content\/content/, { timeout: 60000 })
  await page.waitForTimeout(3000)
  await snap(page, 'contents-entry.png')

  const newBtn = page.locator('[data-cy="new-text-content"]').first()
  if (await newBtn.count()) {
    await newBtn.click()
    await page.waitForURL(/\/content\/content/, { timeout: 60000 })
    await page.waitForTimeout(3000)
    await snap(page, 'contents-entry-edit.png')
  }

  const labelsUrl = `${BASE}/_Admin/content/labels?SiteId=${SITE_ID}`
  await page.goto(labelsUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'labels-list.png')

  await page.locator('[data-cy="edit"]').first().click()
  await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(800)
  await snapDialog(page, 'labels-edit.png')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)

  const textUrl = `${BASE}/_Admin/content/text?SiteId=${SITE_ID}`
  await page.goto(textUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'tag-attributes-list.png')
  const editTag = page.locator('[data-cy="edit"]').first()
  if (await editTag.count()) {
    await editTag.click()
    await page.locator('.el-dialog').last().waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(800)
    await snapDialog(page, 'tag-attributes-edit.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  }

  const userOptionsUrl = `${BASE}/_Admin/content/useroptions?SiteId=${SITE_ID}`
  await page.goto(userOptionsUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'user-options-list.png')

  const newOpt = page.locator('[data-cy="new"]').first()
  if (await newOpt.count()) {
    await newOpt.click()
    await page.waitForURL(/useroptions\/create/, { timeout: 60000 })
    await page.waitForTimeout(2000)
    await snap(page, 'user-options-create.png')
    await page.goBack({ waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(1500)
  }

  const settingLink = page.locator('[data-cy="setting"]').first()
  if (await settingLink.count()) {
    await settingLink.click()
    await page.waitForURL(/useroptions\/setting/, { timeout: 60000 })
    await page.waitForTimeout(2000)
    await snap(page, 'user-options-setting.png')
    await page.goBack({ waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(1500)
  }

  await page.goto(userOptionsUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)
  const editOpt = page.locator('[data-cy="edit"]').first()
  if (await editOpt.count()) {
    await editOpt.click()
    await page.waitForURL(/useroptions\/edit/, { timeout: 60000 })
    await page.waitForTimeout(2000)
    await snap(page, 'user-options-edit.png')
  }

  const filesUrl = `${BASE}/_Admin/content/files?SiteId=${SITE_ID}&folder=/&provider=default`
  await page.goto(filesUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'files-list.png')

  const htmlBlocksUrl = `${BASE}/_Admin/content/htmlblocks?SiteId=${SITE_ID}`
  await page.goto(htmlBlocksUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await snap(page, 'html-blocks-list.png')

  const newHtml = page.locator('[data-cy="new"]').first()
  if (await newHtml.count()) {
    await newHtml.click()
    await page.waitForURL(/htmlBlock\/edit/, { timeout: 60000 })
    await page.waitForTimeout(3000)
    await snap(page, 'html-blocks-edit.png')
  } else {
    const editHtml = page.locator('[data-cy="edit"]').first()
    if (await editHtml.count()) {
      await editHtml.click()
      await page.waitForURL(/htmlBlock\/edit/, { timeout: 60000 })
      await page.waitForTimeout(3000)
      await snap(page, 'html-blocks-edit.png')
    }
  }

  await browser.close()
  console.log('done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
