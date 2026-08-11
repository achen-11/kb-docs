import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { normalizeDocsEditorConfig, renderDocsEditorConfig } from './render-docs-editor-config.mjs'

test('renderDocsEditorConfig creates a complete draft editor service configuration', async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-editor-config-'))
  try {
    const manifest = await renderDocsEditorConfig({
      appDir: '/opt/kb-docs-git',
      authTokenFile: '/etc/kb-docs-editor/auth-token',
      bindHost: '0.0.0.0',
      configDir: '/etc/kb-docs-editor',
      editorPort: '4174',
      fastPreviewHealthUrl: 'http://127.0.0.1:4173/',
      fastPreviewPublicUrl: 'http://192.168.10.75:4173',
      outputDir,
      previewEnvFile: '/etc/kb-docs-preview/preview.env',
      previewRoot: '/srv/kb-docs-preview',
      stableBuildDebounceMs: '6000',
      stablePreviewPublicUrl: 'http://192.168.10.75:4175',
      stablePreviewStatusUrl: 'http://127.0.0.1:4175/__preview/status',
      secureCookie: false,
      serviceGroup: 'kb-docs-preview',
      serviceUser: 'kb-docs-preview',
    })
    assert.equal(manifest.editorPort, 4174)
    const environment = await readFile(path.join(outputDir, 'editor.env'), 'utf8')
    const service = await readFile(path.join(outputDir, 'kb-docs-editor.service'), 'utf8')
    assert.match(environment, /DOCS_EDITOR_HOST=0\.0\.0\.0/u)
    assert.match(environment, /DOCS_EDITOR_PORT=4174/u)
    assert.match(environment, /DOCS_EDITOR_AUTH_TOKEN_FILE=\/etc\/kb-docs-editor\/auth-token/u)
    assert.match(environment, /DOCS_EDITOR_FAST_PREVIEW_PUBLIC_URL=http:\/\/192\.168\.10\.75:4173/u)
    assert.match(environment, /DOCS_EDITOR_FAST_PREVIEW_HEALTH_URL=http:\/\/127\.0\.0\.1:4173/u)
    assert.match(environment, /DOCS_EDITOR_STABLE_PREVIEW_PUBLIC_URL=http:\/\/192\.168\.10\.75:4175/u)
    assert.match(environment, /DOCS_EDITOR_STABLE_PREVIEW_STATUS_URL=http:\/\/127\.0\.0\.1:4175\/__preview\/status/u)
    assert.match(environment, /DOCS_EDITOR_STABLE_BUILD_DEBOUNCE_MS=6000/u)
    assert.match(environment, /DOCS_EDITOR_DRAFT_STATE_FILE=\/srv\/kb-docs-preview\/\.editor-draft\.json/u)
    assert.match(environment, /DOCS_EDITOR_UPDATE_LOCK_FILE=\/srv\/kb-docs-preview\/\.update\.lock/u)
    assert.match(service, /User=kb-docs-preview/u)
    assert.match(service, /docs-editor-server\.mjs/u)
    assert.match(service, /ProtectSystem=strict/u)
    assert.match(service, /ReadWritePaths=\/opt\/kb-docs-git \/srv\/kb-docs-preview/u)
    assert.doesNotMatch(`${environment}${service}`, /\{\{/u)
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
})

test('normalizeDocsEditorConfig rejects unsafe deployment values', () => {
  const valid = {
    appDir: '/opt/kb-docs-git',
    bindHost: '127.0.0.1',
    configDir: '/etc/kb-docs-editor',
    outputDir: '/tmp/kb-docs-editor-config',
    fastPreviewPublicUrl: 'http://127.0.0.1:4173',
    stablePreviewStatusUrl: 'http://127.0.0.1:4175/__preview/status',
    serviceGroup: 'kb-docs-preview',
    serviceUser: 'kb-docs-preview',
  }
  assert.throws(() => normalizeDocsEditorConfig({ ...valid, appDir: 'relative' }), /absolute/u)
  assert.throws(() => normalizeDocsEditorConfig({ ...valid, bindHost: 'all interfaces' }), /bind/u)
  assert.throws(() => normalizeDocsEditorConfig({ ...valid, editorPort: '70000' }), /65535/u)
  assert.throws(
    () => normalizeDocsEditorConfig({ ...valid, fastPreviewPublicUrl: 'file:///tmp/preview' }),
    /http or https/u
  )
  assert.throws(
    () => normalizeDocsEditorConfig({ ...valid, serviceUser: 'root;touch' }),
    /Linux user/u
  )
})
