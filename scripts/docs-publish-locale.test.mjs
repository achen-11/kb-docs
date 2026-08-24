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
  isUnpublishedPublicRoute,
  rewriteLegacyEnglishHrefs,
  stripEnglishUrlPrefix,
  toEnglishSourcePath,
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
