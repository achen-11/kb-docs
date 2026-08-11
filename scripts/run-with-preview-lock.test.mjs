import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  acquirePreviewLock,
  PreviewLockTimeoutError,
  withPreviewLock
} from './run-with-preview-lock.mjs'

test('preview lock serializes concurrent callers and removes the lock after release', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-preview-lock-'))
  const lockFile = path.join(root, 'update.lock')
  try {
    const releaseFirst = await acquirePreviewLock({ lockFile, timeoutMs: 1_000 })
    let secondEntered = false
    const second = withPreviewLock({ lockFile, timeoutMs: 1_000, pollIntervalMs: 10 }, async () => {
      secondEntered = true
    })

    await new Promise((resolve) => setTimeout(resolve, 40))
    assert.equal(secondEntered, false)
    await releaseFirst()
    await second
    assert.equal(secondEntered, true)
    await assert.rejects(() => readFile(lockFile, 'utf-8'), { code: 'ENOENT' })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('preview lock removes a stale owner and rejects a live owner after timeout', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-preview-lock-'))
  const lockFile = path.join(root, 'update.lock')
  try {
    await writeFile(lockFile, '{"pid":99999999,"token":"stale"}\n', 'utf-8')
    const release = await acquirePreviewLock({ lockFile, timeoutMs: 200, pollIntervalMs: 10 })
    await release()

    await writeFile(
      lockFile,
      `${JSON.stringify({ pid: process.pid, token: 'live' })}\n`,
      'utf-8'
    )
    await assert.rejects(
      () => acquirePreviewLock({ lockFile, timeoutMs: 30, pollIntervalMs: 5 }),
      PreviewLockTimeoutError
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('preview lock does not delete a newly created incomplete lock but cleans it after the grace period', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-preview-lock-'))
  const lockFile = path.join(root, 'update.lock')
  try {
    await writeFile(lockFile, '', 'utf-8')
    await assert.rejects(
      () => acquirePreviewLock({ lockFile, timeoutMs: 20, pollIntervalMs: 5 }),
      PreviewLockTimeoutError
    )

    const oldTime = new Date(Date.now() - 31_000)
    await utimes(lockFile, oldTime, oldTime)
    const release = await acquirePreviewLock({ lockFile, timeoutMs: 100, pollIntervalMs: 5 })
    await release()
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
