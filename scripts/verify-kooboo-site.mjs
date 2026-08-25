import { chromium } from 'playwright'

import { PUBLISHED_VERIFY_PATHS } from './docs-publish-locale.mjs'

const siteUrl = process.env.KOOBOO_VERIFY_URL || process.argv[2]
const paths = (process.env.KOOBOO_VERIFY_PATHS || PUBLISHED_VERIFY_PATHS)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const requiredAssets = [
  '/assets/vitepress-app.js',
  '/assets/vitepress-style.css',
  '/assets/vitepress-runtime-data.js',
  '/assets/vitepress-local-search.js',
  '/assets/@localSearchIndexroot.js'
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
  pages: [],
  home: null,
  search: null
}

async function verifySearch(page) {
  const result = {
    buttonFound: false,
    inputFound: false,
    query: 'k.net',
    resultCount: 0,
    error: null
  }

  try {
    const button = page.getByRole('button', { name: 'Search', exact: true })
    result.buttonFound = (await button.count()) > 0
    if (!result.buttonFound) throw new Error('Search button not found')

    await button.first().click()
    const input = page.locator('#localsearch-input')
    await input.waitFor({ state: 'visible', timeout: 10_000 })
    result.inputFound = true
    await input.fill(result.query)
    await page.waitForFunction(
      () => document.querySelectorAll('.VPLocalSearchBox .result').length > 0,
      null,
      { timeout: 15_000 }
    )
    result.resultCount = await page.locator('.VPLocalSearchBox .result').count()
    await page.keyboard.press('Escape')
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
  }

  return result
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
    const productImageResponses = []

    page.on('response', (response) => {
      if (
        /\/(?:dashboard|content-types-list|product-management-list|code-edit-overview|visitor-logs-overview|ai-claw-overview)\.(?:png|webp)(?:\?|$)/.test(
          response.url()
        )
      ) {
        productImageResponses.push(response.url())
      }
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

    if (results.search === null) {
      results.search = await verifySearch(page)
    }

    if (results.home === null && new URL(page.url()).pathname === '/') {
      const productImages = await page
        .locator('.kb-doc-product__thumb img, .kb-doc-product__stage-frame img')
        .evaluateAll((images) =>
          images.map((image) => ({
            src: image.getAttribute('src'),
            loading: image.getAttribute('loading'),
            decoding: image.getAttribute('decoding'),
            fetchPriority: image.getAttribute('fetchpriority')
          }))
        )
      results.home = {
        officialSiteLinks: await page
          .locator('a[href="https://www.kooboo.com/"]')
          .count(),
        officialAiLinks: await page
          .locator('a[href="https://www.kooboo.com/articles/native-ai"][target="_blank"]')
          .count(),
        productImages,
        requestedProductImages: [...new Set(productImageResponses)]
      }
    }

    results.pages.push({
      requestedUrl: url.href,
      finalUrl: page.url(),
      title: await page.title(),
      vitePressStarted: await page.evaluate(() => window.__VITEPRESS__ === true),
      notFound: await page.getByText('PAGE NOT FOUND', { exact: true }).count(),
      appScript: await page
        .locator('script[type="module"][src^="/assets/vitepress-app.js"]')
        .count(),
      styleSheet: await page
        .locator('link[rel~="stylesheet"][href^="/assets/vitepress-style.css"]')
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
  }),
  ...(
    results.search?.buttonFound &&
    results.search?.inputFound &&
    results.search?.resultCount > 0 &&
    !results.search?.error
      ? []
      : [`Local search verification failed: ${results.search?.error || 'no results'}`]
  ),
  ...(
    results.home?.officialSiteLinks > 0
      ? []
      : ['Homepage official-site link was not found']
  ),
  ...(
    results.home?.officialAiLinks > 0
      ? []
      : ['Homepage official AI article link was not found']
  ),
  ...(
    results.home?.productImages?.length > 0 &&
    results.home.productImages.every(
      (image) =>
        image.src?.endsWith('.webp') &&
        image.loading === 'lazy' &&
        image.decoding === 'async' &&
        image.fetchPriority === 'low'
    )
      ? []
      : ['Homepage product images are not optimized WebP lazy-load resources']
  ),
  ...(
    results.home?.requestedProductImages?.length <= 1
      ? []
      : ['Homepage eagerly requested more than one product preview image']
  )
]

console.log(JSON.stringify({ ...results, ok: failures.length === 0, failures }, null, 2))

if (failures.length) {
  process.exitCode = 1
}
