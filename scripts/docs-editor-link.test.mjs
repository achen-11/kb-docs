import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createEditLinkConfig, createEditorUrl } from '../docs/.vitepress/editor-link.mjs'

test('editor links are disabled unless an explicit base URL is configured', () => {
  assert.equal(createEditLinkConfig('', 'Edit'), undefined)
  assert.equal(createEditLinkConfig(undefined, 'Edit'), undefined)
})

test('editor links preserve VitePress filePath and encode it as a docs path', () => {
  assert.equal(
    createEditorUrl('http://192.168.10.75:4174/', 'cms/内容 index.md'),
    'http://192.168.10.75:4174/?path=docs%2Fcms%2F%E5%86%85%E5%AE%B9+index.md'
  )
  assert.equal(
    createEditorUrl('https://docs-editor.example/internal', 'en/api/index.md'),
    'https://docs-editor.example/internal?path=docs%2Fen%2Fapi%2Findex.md'
  )
  const config = createEditLinkConfig('http://192.168.10.75:4174/', 'Edit')
  assert.equal(
    config.pattern({ filePath: 'cms/内容 index.md' }),
    'http://192.168.10.75:4174/?path=docs%2Fcms%2F%E5%86%85%E5%AE%B9+index.md'
  )
  assert.doesNotMatch(String(config.pattern), /createEditorUrl/u)
})

test('editor link configuration rejects unsafe base URLs', () => {
  assert.throws(() => createEditLinkConfig('file:///tmp/editor', 'Edit'), /http or https/u)
  assert.throws(
    () => createEditLinkConfig('https://user:secret@example.com/', 'Edit'),
    /must not contain/u
  )
  assert.throws(
    () => createEditLinkConfig('https://example.com/?token=secret', 'Edit'),
    /must not contain/u
  )
})

test('preview installer enables edit links during the initial publish', async () => {
  const installScript = await readFile(
    new URL('../deploy/preview/install.sh', import.meta.url),
    'utf8'
  )
  assert.match(
    installScript,
    /DOCS_EDITOR_BASE_URL="\$\{EDITOR_BASE_URL\}"[\s\S]+corepack pnpm docs:preview:publish/u
  )
})
