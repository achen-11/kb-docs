import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  normalizePreviewServerConfig,
  renderPreviewServerConfig
} from './render-preview-server-config.mjs'

test('renderPreviewServerConfig creates complete Linux service configuration', async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-preview-config-'))
  try {
    const manifest = await renderPreviewServerConfig({
      appDir: '/opt/kb-docs',
      bindHost: '0.0.0.0',
      configDir: '/etc/kb-docs-preview',
      dataDir: '/srv/kb-docs-preview',
      editorBaseUrl: 'http://192.168.10.75:4174/',
      gitBranch: 'preview/main',
      gitRemote: 'cnb',
      keepReleases: '7',
      outputDir,
      previewHostname: 'docs-preview.kbdev.com',
      previewPort: '4180',
      serviceGroup: 'kb-docs-preview',
      serviceUser: 'kb-docs-preview',
      syncIntervalSeconds: '45',
      updateLockTimeoutMs: '240000'
    })
    assert.equal(manifest.keepReleases, 7)
    assert.equal(manifest.previewPort, 4180)

    const service = await readFile(path.join(outputDir, 'kb-docs-preview.service'), 'utf-8')
    const nginx = await readFile(path.join(outputDir, 'kb-docs-preview.nginx.conf'), 'utf-8')
    const syncService = await readFile(
      path.join(outputDir, 'kb-docs-preview-sync.service'),
      'utf-8'
    )
    const syncTimer = await readFile(path.join(outputDir, 'kb-docs-preview-sync.timer'), 'utf-8')
    const environment = await readFile(path.join(outputDir, 'preview.env'), 'utf-8')
    const askpass = await readFile(path.join(outputDir, 'git-askpass.sh'), 'utf-8')
    assert.match(service, /User=kb-docs-preview/u)
    assert.match(service, /ReadWritePaths=\/opt\/kb-docs \/srv\/kb-docs-preview/u)
    assert.match(nginx, /server_name docs-preview\.kbdev\.com;/u)
    assert.match(nginx, /127\.0\.0\.1:4180/u)
    assert.match(environment, /DOCS_PREVIEW_KEEP_RELEASES=7/u)
    assert.match(environment, /DOCS_PREVIEW_HOST=0\.0\.0\.0/u)
    assert.match(environment, /DOCS_PREVIEW_GIT_REMOTE=cnb/u)
    assert.match(environment, /DOCS_PREVIEW_GIT_BRANCH=preview\/main/u)
    assert.match(environment, /DOCS_EDITOR_BASE_URL=http:\/\/192\.168\.10\.75:4174/u)
    assert.match(environment, /DOCS_PREVIEW_UPDATE_LOCK_TIMEOUT_MS=240000/u)
    assert.match(environment, /DOCS_EDITOR_DRAFT_STATE_FILE=\/srv\/kb-docs-preview\/\.editor-draft\.json/u)
    assert.match(environment, /GIT_TERMINAL_PROMPT=0/u)
    assert.match(environment, /GIT_ASKPASS=\/etc\/kb-docs-preview\/git-askpass\.sh/u)
    assert.match(environment, /git-deploy-key/u)
    assert.match(askpass, /git-username/u)
    assert.match(askpass, /git-token/u)
    assert.match(syncService, /sync-preview-from-git\.mjs/u)
    assert.match(syncTimer, /OnUnitActiveSec=45s/u)
    assert.doesNotMatch(
      `${service}${syncService}${syncTimer}${nginx}${environment}${askpass}`,
      /\{\{/u
    )
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
})

test('normalizePreviewServerConfig rejects unsafe server values', () => {
  const valid = {
    appDir: '/opt/kb-docs',
    bindHost: '127.0.0.1',
    configDir: '/etc/kb-docs-preview',
    dataDir: '/srv/kb-docs-preview',
    editorBaseUrl: '',
    outputDir: '/tmp/rendered-preview',
    previewHostname: 'docs-preview.kbdev.com',
    serviceGroup: 'kb-docs-preview',
    serviceUser: 'kb-docs-preview'
  }
  assert.throws(
    () => normalizePreviewServerConfig({ ...valid, previewHostname: 'bad host' }),
    /hostname/u
  )
  assert.throws(
    () => normalizePreviewServerConfig({ ...valid, appDir: 'relative/path' }),
    /absolute path/u
  )
  assert.throws(
    () => normalizePreviewServerConfig({ ...valid, serviceUser: 'root;echo' }),
    /Linux user/u
  )
  assert.throws(
    () => normalizePreviewServerConfig({ ...valid, previewPort: '70000' }),
    /between 1 and 65535/u
  )
  assert.throws(
    () => normalizePreviewServerConfig({ ...valid, bindHost: 'all interfaces' }),
    /bind host/u
  )
  assert.throws(
    () => normalizePreviewServerConfig({ ...valid, gitBranch: '../main' }),
    /branch/u
  )
  assert.throws(
    () => normalizePreviewServerConfig({ ...valid, gitRemote: 'origin;touch' }),
    /remote/u
  )
  assert.throws(
    () => normalizePreviewServerConfig({ ...valid, editorBaseUrl: 'file:///tmp/editor' }),
    /editor base URL/u
  )
})
