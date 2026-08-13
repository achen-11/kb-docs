import test from 'node:test'
import assert from 'node:assert/strict'

import {
  absolutizeDocumentRelativeUrls,
  injectCssRouteComment,
  injectJsRouteComment,
  injectPageRouteComment,
  toKoobooPageRoute
} from './export-vitepress-to-kooboo.mjs'
import {
  getCmsScreenshotLocaleConfig,
  resolveCmsScreenshotOutputDir
} from './cms-screenshot-locale.mjs'
import { isDocImagePath } from './sync-doc-images-to-kooboo.mjs'
import { resolveLocalizedDocImageSrc } from '../docs/.vitepress/theme/doc-image-path.mjs'

test('toKoobooPageRoute keeps index.html in path for Kooboo Page API', () => {
  assert.equal(toKoobooPageRoute('index.html'), '/index.html')
  assert.equal(toKoobooPageRoute('guide/index.html'), '/guide/index.html')
  assert.equal(toKoobooPageRoute('cms/index.html'), '/cms/index.html')
})

test('toKoobooPageRoute keeps html extension for non-index pages', () => {
  assert.equal(toKoobooPageRoute('api/getting-started/auth.html'), '/api/getting-started/auth.html')
  assert.equal(toKoobooPageRoute('404.html'), '/404.html')
})

test('injectPageRouteComment replaces existing page route comment', () => {
  const result = injectPageRouteComment('<!-- @k-url /old -->\n<!DOCTYPE html>', '/new/')
  assert.equal(result, '<!-- @k-url /new/ -->\n<!DOCTYPE html>')
})

test('absolutizeDocumentRelativeUrls protects links from Kooboo page normalization', () => {
  const html = [
    '<a href="./login.html#token">Login</a>',
    '<a href="../index.html?lang=en">Index</a>',
    '<img src="../../images/logo.png">',
    '<a href="/api/">Directory</a>',
    '<a href="/api/account/login">Clean URL</a>',
    '<a href="/">Home</a>',
    '<a href="https://example.com/docs.html">External</a>',
  ].join('')

  assert.equal(
    absolutizeDocumentRelativeUrls(
      html,
      'api/account/index.html',
      new Set(['api/account/login.html'])
    ),
    [
      '<a href="/api/account/login.html#token">Login</a>',
      '<a href="/api/index.html?lang=en">Index</a>',
      '<img src="/images/logo.png">',
      '<a href="/api/index.html">Directory</a>',
      '<a href="/api/account/login.html">Clean URL</a>',
      '<a href="/">Home</a>',
      '<a href="https://example.com/docs.html">External</a>',
    ].join('')
  )
})

test('injectJsRouteComment replaces existing js route comment', () => {
  const result = injectJsRouteComment('// @k-url /old.js\nconsole.log("ok")\n', '/assets/app.js')
  assert.equal(result, '// @k-url /assets/app.js\nconsole.log("ok")\n')
})

test('isDocImagePath matches localized documentation image roots', () => {
  assert.equal(isDocImagePath('cms/getting-started/01.png'), true)
  assert.equal(isDocImagePath('en/cms/getting-started/01.png'), true)
  assert.equal(isDocImagePath('product/mail/overview.png'), true)
  assert.equal(isDocImagePath('en/product/mail/overview.png'), true)
  assert.equal(isDocImagePath('assets/style.abc.css'), false)
  assert.equal(isDocImagePath('cms/readme.txt'), false)
})

test('resolveLocalizedDocImageSrc switches CMS screenshots for English docs', () => {
  assert.equal(
    resolveLocalizedDocImageSrc('/cms/content/content-types-list.png', '/en/cms/content/content-types'),
    '/en/cms/content/content-types-list.png'
  )
  assert.equal(
    resolveLocalizedDocImageSrc('/cms/content/content-types-list.png', '/cms/content/content-types'),
    '/cms/content/content-types-list.png'
  )
  assert.equal(
    resolveLocalizedDocImageSrc('/en/cms/content/content-types-list.png', '/en/cms/content/content-types'),
    '/en/cms/content/content-types-list.png'
  )
  assert.equal(
    resolveLocalizedDocImageSrc('/logo.svg', '/en/cms/content/content-types'),
    '/logo.svg'
  )
})

test('resolveLocalizedDocImageSrc switches Product screenshots for English docs', () => {
  assert.equal(
    resolveLocalizedDocImageSrc(
      '/product/console/membership-overview.png',
      '/en/product/console/membership'
    ),
    '/en/product/console/membership-overview.png'
  )
  assert.equal(
    resolveLocalizedDocImageSrc(
      '/product/console/membership-overview.png',
      '/product/console/membership'
    ),
    '/product/console/membership-overview.png'
  )
  assert.equal(
    resolveLocalizedDocImageSrc(
      '/en/product/console/membership-overview.png',
      '/en/product/console/membership'
    ),
    '/en/product/console/membership-overview.png'
  )
})

test('getCmsScreenshotLocaleConfig returns English screenshot settings', () => {
  assert.deepEqual(getCmsScreenshotLocaleConfig('en'), {
    locale: 'en',
    browserLocale: 'en-US',
    acceptLanguage: 'en-US,en;q=0.9',
    cmsLangCookieValue: 'en',
    publicDirSegments: ['docs', 'public', 'en', 'cms'],
  })
})

test('resolveCmsScreenshotOutputDir places English screenshots under docs/public/en/cms', () => {
  assert.equal(
    resolveCmsScreenshotOutputDir('/repo', 'content', 'en'),
    '/repo/docs/public/en/cms/content'
  )
  assert.equal(
    resolveCmsScreenshotOutputDir('/repo', 'site', 'zh'),
    '/repo/docs/public/cms/site'
  )
})

test('injectCssRouteComment replaces existing css route comment', () => {
  const result = injectCssRouteComment(
    '/* @k-url /old.css */\nbody { color: red; }\n',
    '/assets/style.css'
  )
  assert.equal(result, '/* @k-url /assets/style.css */\nbody { color: red; }\n')
})
