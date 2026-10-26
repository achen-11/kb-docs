import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PUBLISH_CLI,
  PUBLISH_PRODUCT_FEATURES,
  PUBLISH_ZH,
  PUBLISHED_VERIFY_PATHS,
  UNPUBLISHED_EN_SRC_GLOBS,
  UNPUBLISHED_INTERNAL_SRC_GLOBS,
  UNPUBLISHED_PUBLIC_ROUTE_PREFIXES,
  UNPUBLISHED_ZH_SRC_GLOBS,
  canonicalPathFromLegacyEnglish,
  isEnglishDocRoute,
  isLocalChinesePreview,
  isUnpublishedPublicRoute,
  prefixLocalChineseDocHref,
  rewriteLegacyEnglishHrefs,
  stripEnglishUrlPrefix,
  toEnglishSourcePath,
  withLocalChinesePreviewRewrites,
} from './docs-publish-locale.mjs'

test('published sites verify English pages at the site root', () => {
  assert.equal(PUBLISH_ZH, false)
  assert.equal(PUBLISHED_VERIFY_PATHS, '/,/cms/index.html,/api/net/ip.html')
  assert.ok(UNPUBLISHED_ZH_SRC_GLOBS.includes('index.md'))
  assert.ok(UNPUBLISHED_ZH_SRC_GLOBS.includes('cms/**'))
  assert.ok(!UNPUBLISHED_ZH_SRC_GLOBS.some((pattern) => pattern.startsWith('en/')))
})

test('formal release excludes CLI and the current Product Features drafts', () => {
  assert.equal(PUBLISH_CLI, false)
  assert.equal(PUBLISH_PRODUCT_FEATURES, false)
  assert.ok(UNPUBLISHED_EN_SRC_GLOBS.includes('en/cli/**'))
  assert.ok(UNPUBLISHED_EN_SRC_GLOBS.includes('en/product/**'))
  assert.ok(UNPUBLISHED_INTERNAL_SRC_GLOBS.includes('superpowers/**'))
  assert.deepEqual(UNPUBLISHED_PUBLIC_ROUTE_PREFIXES, ['/cli', '/product', '/superpowers'])
  assert.equal(isUnpublishedPublicRoute('/cli/'), true)
  assert.equal(isUnpublishedPublicRoute('/product/console?tab=billing'), true)
  assert.equal(isUnpublishedPublicRoute('/superpowers/plans/example'), true)
  assert.equal(isUnpublishedPublicRoute('/cms/'), false)
})

test('legacy /en/ page URLs rewrite to the English root', () => {
  assert.equal(stripEnglishUrlPrefix('/en/'), '/')
  assert.equal(stripEnglishUrlPrefix('/en/cms/'), '/cms/')
  assert.equal(stripEnglishUrlPrefix('/cms/'), '/cms/')
  assert.equal(toEnglishSourcePath('cms/index.md'), 'en/cms/index.md')
  assert.equal(toEnglishSourcePath('en/cms/index.md'), 'en/cms/index.md')
  assert.equal(canonicalPathFromLegacyEnglish('/en/cms/index.html'), '/cms/index.html')
  assert.equal(canonicalPathFromLegacyEnglish('/en/cms/list.png'), null)
  assert.equal(canonicalPathFromLegacyEnglish('/en/index.md?t=1'), null)
  assert.equal(canonicalPathFromLegacyEnglish('/en/cms/index.md'), null)
  assert.equal(rewriteLegacyEnglishHrefs('<a href="/en/api/">API</a>'), '<a href="/api/">API</a>')
  assert.equal(isEnglishDocRoute('/cms/'), true)
  assert.equal(isEnglishDocRoute('/zh/cms/'), false)
})

test('DOCS_PREVIEW_ZH only affects vitepress dev', () => {
  const devArgv = ['node', 'vitepress', 'dev', 'docs']
  const buildArgv = ['node', 'vitepress', 'build', 'docs']
  assert.equal(isLocalChinesePreview({ DOCS_PREVIEW_ZH: '1' }, devArgv), true)
  assert.equal(isLocalChinesePreview({ DOCS_PREVIEW_ZH: 'true' }, devArgv), true)
  assert.equal(isLocalChinesePreview({}, devArgv), false)
  assert.equal(isLocalChinesePreview({ DOCS_PREVIEW_ZH: '0' }, devArgv), false)
  assert.equal(isLocalChinesePreview({ DOCS_PREVIEW_ZH: '1' }, buildArgv), false)
  assert.equal(isLocalChinesePreview({ DOCS_PREVIEW_ZH: '1' }, ['node', 'vitepress', 'preview']), false)
  assert.equal(isLocalChinesePreview({ DOCS_PREVIEW_ZH: '1' }, ['node', 'vitepress', 'dev', 'build']), false)
})

test('local Chinese preview keeps English routes and nests Chinese sources under /zh', () => {
  const rewrites = withLocalChinesePreviewRewrites({
    'en/:rest*': ':rest*',
    'api/core/api.md': 'api/api/index.md',
    'templateEngine/page.md': 'templateEngine/page/index.md',
  })
  assert.equal(rewrites['en/:rest*'], ':rest*')
  assert.equal(rewrites['api/core/api.md'], 'zh/api/api/index.md')
  assert.equal(rewrites['templateEngine/page.md'], 'zh/templateEngine/page/index.md')
  assert.equal(rewrites['cms/:rest*'], 'zh/cms/:rest*')
  assert.equal(rewrites['index.md'], 'zh/index.md')
  assert.equal(prefixLocalChineseDocHref('/cms/manual/edit-page.md'), '/zh/cms/manual/edit-page.md')
  assert.equal(prefixLocalChineseDocHref('/cms/site/pages.md#open'), '/zh/cms/site/pages.md#open')
  assert.equal(prefixLocalChineseDocHref('./edit-page.md'), './edit-page.md')
  assert.equal(prefixLocalChineseDocHref('/cms/manual/edit-page/pages.jpg'), '/cms/manual/edit-page/pages.jpg')
  assert.equal(prefixLocalChineseDocHref('/zh/cms/'), '/zh/cms/')
  assert.equal(prefixLocalChineseDocHref('/'), '/zh/')
})
