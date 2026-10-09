import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalDocPath, createDocSeo } from './docs-seo.mjs'

test('canonical paths preserve Kooboo directory index routes and normalize the homepage', () => {
  assert.equal(canonicalDocPath('index.md'), '/')
  assert.equal(canonicalDocPath('cms/index.md'), '/cms/index.html')
  assert.equal(canonicalDocPath('cms/login.md'), '/cms/login.html')
})

test('SEO uses content rather than menu locations and disambiguates section titles', () => {
  const page = { relativePath: 'cms/commerce/settings.md', title: 'Settings', frontmatter: {} }
  const seo = createDocSeo(page, '# Settings\n\n> Menu: Commerce → Settings\n\nConfigure currencies and checkout options for your store.')
  assert.equal(seo.title, 'Settings | Commerce | Admin CMS')
  assert.ok(seo.description.includes('Configure currencies'))
  assert.ok(!seo.description.includes('Menu:'))
  assert.equal(seo.canonical, 'https://docs.kooboo.com/cms/commerce/settings.html')
})

test('descriptions preserve inline code and explicit editorial metadata', () => {
  const page = { relativePath: 'api/index.md', title: 'API Details', frontmatter: {} }
  assert.ok(createDocSeo(page, '# API Details\n\nUse `k.*` APIs and `<k-query>` bindings in Kooboo.').description.includes('k-query'))
  page.frontmatter = { title: 'Kooboo API Reference', description: 'An explicit summary.' }
  assert.equal(createDocSeo(page, '# API Details').description, 'An explicit summary.')
  assert.equal(createDocSeo(page, '# API Details').title, 'Kooboo API Reference')
})

test('descriptions skip route-location quotes and keep placeholders literal for Kooboo rendering', () => {
  const page = { relativePath: 'cms/content/contents-entries.md', title: 'Content Entries', frontmatter: {} }
  const seo = createDocSeo(page, '# Content Entries\n\n> Folder: /_Admin/content?folder={id}\n\nEdit content entries in the selected folder and publish changes.')
  assert.ok(!seo.description.includes('/_Admin/'))
  assert.ok(seo.description.includes('Edit content entries'))
  const api = createDocSeo(page, '# Content Entries\n\nRead /_module/{name} endpoints in Kooboo.')
  assert.ok(api.description.includes('[name]'))
})
