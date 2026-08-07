import assert from 'node:assert/strict'
import test from 'node:test'

import { measureNodeSize, measureText } from 'vitepress-plugin-mermaid-diagram'

test('Mermaid diagram measures CJK glyphs as full-width characters', () => {
  assert.equal(measureText('登录与站点列表').width, 98)
  assert.equal(measureText('ログイン').width, 56)
  assert.equal(measureText('로그인').width, 42)
})

test('Mermaid flowchart nodes retain horizontal padding around Chinese labels', () => {
  const labelWidth = measureText('登录与站点列表').width
  const nodeSize = measureNodeSize('登录与站点列表')

  assert.equal(nodeSize.width - labelWidth, 40)
})
