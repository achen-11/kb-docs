import { chromium } from 'playwright'

const siteUrl = process.env.KOOBOO_VERIFY_URL || process.argv[2]
const paths = (process.env.KOOBOO_VERIFY_PATHS || '/,/api/utils/ip.html')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const requiredAssets = [
  '/assets/vitepress-app.js',
  '/assets/vitepress-style.css'
]

if (!siteUrl) {
  console.error(
    'Missing site URL. Set KOOBOO_VERIFY_URL or pass the URL as the first argument.'
  )
  process.exit(1)
}

const baseUrl = new URL(siteUrl)
const results = {
  siteUrl: baseUrl.origin,
  assets: [],
  pages: []
}

let browser

try {
  for (const assetPath of requiredAssets) {
    const url = new URL(assetPath, baseUrl)
    const response = await fetch(url)
    results.assets.push({
      url: url.href,
      status: response.status,
      contentType: response.headers.get('content-type')
    })
  }

  browser = await chromium.launch({ headless: true })

  for (const pagePath of paths) {
    const page = await browser.newPage()
    const failedResponses = []
    const consoleErrors = []
    const pageErrors = []

    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedResponses.push({
          status: response.status(),
          url: response.url()
        })
      }
    })
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text())
      }
    })
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
    })

    const url = new URL(pagePath, baseUrl)
    await page.goto(url.href, { waitUntil: 'networkidle', timeout: 60_000 })
    await page.waitForFunction(() => window.__VITEPRESS__ === true, null, {
      timeout: 10_000
    })
    await page.waitForTimeout(1_000)

    results.pages.push({
      requestedUrl: url.href,
      finalUrl: page.url(),
      title: await page.title(),
      vitePressStarted: await page.evaluate(() => window.__VITEPRESS__ === true),
      notFound: await page.getByText('PAGE NOT FOUND', { exact: true }).count(),
      appScript: await page
        .locator('script[type="module"][src="/assets/vitepress-app.js"]')
        .count(),
      styleSheet: await page
        .locator('link[rel~="stylesheet"][href="/assets/vitepress-style.css"]')
        .count(),
      failedResponses,
      consoleErrors,
      pageErrors
    })

    await page.close()
  }
} finally {
  await browser?.close()
}

const failures = [
  ...results.assets.flatMap((asset) =>
    asset.status === 200 ? [] : [`${asset.url} returned ${asset.status}`]
  ),
  ...results.pages.flatMap((page) => {
    const pageFailures = []
    if (!page.vitePressStarted) pageFailures.push(`${page.finalUrl}: VitePress did not start`)
    if (page.notFound) pageFailures.push(`${page.finalUrl}: rendered PAGE NOT FOUND`)
    if (!page.appScript) pageFailures.push(`${page.finalUrl}: missing VitePress app script`)
    if (!page.styleSheet) pageFailures.push(`${page.finalUrl}: missing VitePress stylesheet`)
    if (page.failedResponses.length) {
      pageFailures.push(`${page.finalUrl}: HTTP failures detected`)
    }
    if (page.consoleErrors.length) {
      pageFailures.push(`${page.finalUrl}: console errors detected`)
    }
    if (page.pageErrors.length) {
      pageFailures.push(`${page.finalUrl}: page errors detected`)
    }
    return pageFailures
  })
]

console.log(JSON.stringify({ ...results, ok: failures.length === 0, failures }, null, 2))

if (failures.length) {
  process.exitCode = 1
}
