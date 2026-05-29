import test from 'node:test'
import assert from 'node:assert/strict'

import {
  injectCssRouteComment,
  injectJsRouteComment,
  injectPageRouteComment,
  toKoobooPageRoute
} from './export-vitepress-to-kooboo.mjs'

test('toKoobooPageRoute maps root index to slash', () => {
  assert.equal(toKoobooPageRoute('index.html'), '/')
})

test('toKoobooPageRoute maps directory index to trailing slash route', () => {
  assert.equal(toKoobooPageRoute('guide/index.html'), '/guide/')
})

test('toKoobooPageRoute keeps html extension for non-index pages', () => {
  assert.equal(toKoobooPageRoute('api/getting-started/auth.html'), '/api/getting-started/auth.html')
  assert.equal(toKoobooPageRoute('404.html'), '/404.html')
})

test('injectPageRouteComment replaces existing page route comment', () => {
  const result = injectPageRouteComment('<!-- @k-url /old -->\n<!DOCTYPE html>', '/new/')
  assert.equal(result, '<!-- @k-url /new/ -->\n<!DOCTYPE html>')
})

test('injectJsRouteComment replaces existing js route comment', () => {
  const result = injectJsRouteComment('// @k-url /old.js\nconsole.log("ok")\n', '/assets/app.js')
  assert.equal(result, '// @k-url /assets/app.js\nconsole.log("ok")\n')
})

test('injectCssRouteComment replaces existing css route comment', () => {
  const result = injectCssRouteComment(
    '/* @k-url /old.css */\nbody { color: red; }\n',
    '/assets/style.css'
  )
  assert.equal(result, '/* @k-url /assets/style.css */\nbody { color: red; }\n')
})
