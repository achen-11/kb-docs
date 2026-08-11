import assert from 'node:assert/strict'
import test from 'node:test'

import { checkFastPreview } from './check-docs-fast-preview.mjs'

test('checkFastPreview accepts a successful Dev Server response', async (t) => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.method, 'HEAD')
    return new Response(null, { status: 200, headers: { Location: 'http://preview.test/' } })
  }

  const result = await checkFastPreview({ url: 'http://preview.test/', timeoutMs: 1000 })
  assert.equal(result.status, 'ready')
})

test('checkFastPreview rejects non-success responses', async (t) => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })
  globalThis.fetch = async () => new Response(null, { status: 503 })

  await assert.rejects(
    () => checkFastPreview({ url: 'http://preview.test/', timeoutMs: 1000 }),
    /HTTP 503/u
  )
})
