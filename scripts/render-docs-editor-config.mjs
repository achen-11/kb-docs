import { mkdir, readFile, writeFile } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { PUBLISHED_VERIFY_PATHS } from './docs-publish-locale.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const templatesDir = path.join(projectRoot, 'deploy', 'editor', 'templates')

function readArg(argv, name) {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

function assertSafeIdentity(value, name) {
  if (!/^[a-z_][a-z0-9_-]*$/u.test(value)) {
    throw new Error(`${name} must be a Linux user or group name`)
  }
  return value
}

function assertAbsolutePath(value, name) {
  if (!path.isAbsolute(value) || /[\r\n\0]/u.test(value) || /\s/u.test(value)) {
    throw new Error(`${name} must be an absolute path without whitespace`)
  }
  return path.normalize(value)
}

function assertBindHost(value) {
  if (value !== 'localhost' && net.isIP(value) === 0) {
    throw new Error('bind host must be localhost or an IP address')
  }
  return value
}

function assertHttpUrl(value, name) {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error(`${name} must be an http or https URL without credentials`)
  }
  if (url.hash || /[\r\n\0]/u.test(value)) {
    throw new Error(`${name} must not contain a hash or control characters`)
  }
  return url.toString().replace(/\/$/u, '')
}

function readPort(value) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error('editor port must be an integer between 1 and 65535')
  }
  return parsed
}

function readPositiveInteger(value, fallback, name, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`)
  }
  return parsed
}

function renderTemplate(template, replacements) {
  const rendered = template.replace(/\{\{([A-Z0-9_]+)\}\}/gu, (_match, name) => {
    if (!(name in replacements)) throw new Error(`Missing template value: ${name}`)
    return String(replacements[name])
  })
  if (/\{\{[A-Z0-9_]+\}\}/u.test(rendered)) {
    throw new Error('Rendered editor configuration contains unresolved placeholders')
  }
  return rendered
}

export function normalizeDocsEditorConfig(input) {
  const configDir = assertAbsolutePath(input.configDir, 'config directory')
  const previewRoot = assertAbsolutePath(input.previewRoot || '/srv/kb-docs-preview', 'preview root')
  const productionPublishEnabled = Boolean(input.productionPublishEnabled)
  if (productionPublishEnabled && !input.koobooTargetUrl) {
    throw new Error('Kooboo target URL is required when production publishing is enabled')
  }
  return {
    appDir: assertAbsolutePath(input.appDir, 'app directory'),
    authTokenFile: assertAbsolutePath(
      input.authTokenFile || path.join(configDir, 'auth-token'),
      'auth token file'
    ),
    bindHost: assertBindHost(input.bindHost || '127.0.0.1'),
    configDir,
    editorPort: readPort(input.editorPort || '4174'),
    koobooArtifactDir: assertAbsolutePath(
      input.koobooArtifactDir || '/srv/kb-docs-kooboo-artifact',
      'Kooboo artifact directory'
    ),
    koobooBaselineFile: assertAbsolutePath(
      input.koobooBaselineFile || path.join(previewRoot, 'kooboo-deploy-baseline.json'),
      'Kooboo baseline file'
    ),
    koobooInitialBaseline: String(input.koobooInitialBaseline || ''),
    koobooTargetUrl: input.koobooTargetUrl ? assertHttpUrl(input.koobooTargetUrl, 'Kooboo target URL') : '',
    koobooVerifyPaths: String(input.koobooVerifyPaths || PUBLISHED_VERIFY_PATHS),
    outputDir: path.resolve(input.outputDir),
    auditLog: assertAbsolutePath(
      input.auditLog || path.join(previewRoot, 'editor-audit.jsonl'),
      'audit log'
    ),
    draftStateFile: assertAbsolutePath(
      input.draftStateFile || path.join(previewRoot, '.editor-draft.json'),
      'draft state file'
    ),
    previewEnvFile: assertAbsolutePath(
      input.previewEnvFile || '/etc/kb-docs-preview/preview.env',
      'preview environment file'
    ),
    fastPreviewHealthUrl: assertHttpUrl(
      input.fastPreviewHealthUrl || 'http://127.0.0.1:4173/',
      'fast preview health URL'
    ),
    fastPreviewPublicUrl: assertHttpUrl(
      input.fastPreviewPublicUrl || input.previewPublicUrl,
      'fast preview public URL'
    ),
    previewRoot,
    productionPublishEnabled: productionPublishEnabled ? 'true' : 'false',
    stableBuildDebounceMs: readPositiveInteger(
      input.stableBuildDebounceMs,
      8_000,
      'stable preview build debounce',
      300_000
    ),
    stablePreviewPublicUrl: assertHttpUrl(
      input.stablePreviewPublicUrl || 'http://127.0.0.1:4175',
      'stable preview public URL'
    ),
    stablePreviewStatusUrl: assertHttpUrl(
      input.stablePreviewStatusUrl || input.previewStatusUrl,
      'stable preview status URL'
    ),
    secureCookie: input.secureCookie ? 'true' : 'false',
    serviceGroup: assertSafeIdentity(input.serviceGroup, 'service group'),
    serviceUser: assertSafeIdentity(input.serviceUser, 'service user'),
    updateLockFile: assertAbsolutePath(
      input.updateLockFile || path.join(previewRoot, '.update.lock'),
      'preview update lock file'
    ),
    updateLockTimeoutMs: readPositiveInteger(
      input.updateLockTimeoutMs,
      180_000,
      'preview update lock timeout',
      3_600_000
    ),
  }
}

export async function renderDocsEditorConfig(input) {
  const config = normalizeDocsEditorConfig(input)
  const replacements = {
    APP_DIR: config.appDir,
    AUDIT_LOG: config.auditLog,
    AUTH_TOKEN_FILE: config.authTokenFile,
    BIND_HOST: config.bindHost,
    CONFIG_DIR: config.configDir,
    DRAFT_STATE_FILE: config.draftStateFile,
    EDITOR_PORT: config.editorPort,
    FAST_PREVIEW_HEALTH_URL: config.fastPreviewHealthUrl,
    FAST_PREVIEW_PUBLIC_URL: config.fastPreviewPublicUrl,
    KOOBOO_ARTIFACT_DIR: config.koobooArtifactDir,
    KOOBOO_BASELINE_FILE: config.koobooBaselineFile,
    KOOBOO_INITIAL_BASELINE: config.koobooInitialBaseline,
    KOOBOO_TARGET_URL: config.koobooTargetUrl,
    KOOBOO_VERIFY_PATHS: config.koobooVerifyPaths,
    PREVIEW_ENV_FILE: config.previewEnvFile,
    PREVIEW_ROOT: config.previewRoot,
    PRODUCTION_PUBLISH_ENABLED: config.productionPublishEnabled,
    STABLE_BUILD_DEBOUNCE_MS: config.stableBuildDebounceMs,
    STABLE_PREVIEW_PUBLIC_URL: config.stablePreviewPublicUrl,
    STABLE_PREVIEW_STATUS_URL: config.stablePreviewStatusUrl,
    SECURE_COOKIE: config.secureCookie,
    SERVICE_GROUP: config.serviceGroup,
    SERVICE_USER: config.serviceUser,
    UPDATE_LOCK_FILE: config.updateLockFile,
    UPDATE_LOCK_TIMEOUT_MS: config.updateLockTimeoutMs,
  }
  const templateFiles = {
    'editor.env': 'editor.env.template',
    'kb-docs-editor.service': 'kb-docs-editor.service.template',
  }

  await mkdir(config.outputDir, { recursive: true })
  for (const [outputName, templateName] of Object.entries(templateFiles)) {
    const template = await readFile(path.join(templatesDir, templateName), 'utf8')
    await writeFile(path.join(config.outputDir, outputName), renderTemplate(template, replacements), {
      encoding: 'utf8',
      mode: 0o640,
    })
  }
  const manifest = { schemaVersion: 1, generatedAt: new Date().toISOString(), ...config }
  await writeFile(
    path.join(config.outputDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  )
  return manifest
}

async function main() {
  const argv = process.argv.slice(2)
  const serviceUser = readArg(argv, '--user') || 'kb-docs-preview'
  const configDir = readArg(argv, '--config-dir') || '/etc/kb-docs-editor'
  const manifest = await renderDocsEditorConfig({
    appDir: readArg(argv, '--app-dir') || '/opt/kb-docs-git',
    authTokenFile: readArg(argv, '--auth-token-file') || path.join(configDir, 'auth-token'),
    bindHost: readArg(argv, '--bind-host') || '127.0.0.1',
    configDir,
    editorPort: readArg(argv, '--port') || '4174',
    koobooArtifactDir: readArg(argv, '--kooboo-artifact-dir') || '/srv/kb-docs-kooboo-artifact',
    koobooBaselineFile: readArg(argv, '--kooboo-baseline-file'),
    koobooInitialBaseline: readArg(argv, '--kooboo-initial-baseline') || '',
    koobooTargetUrl: readArg(argv, '--kooboo-target-url') || '',
    koobooVerifyPaths: readArg(argv, '--kooboo-verify-paths') || PUBLISHED_VERIFY_PATHS,
    outputDir:
      readArg(argv, '--output-dir') || path.join(projectRoot, '.local-preview', 'editor-config'),
    previewEnvFile:
      readArg(argv, '--preview-env-file') || '/etc/kb-docs-preview/preview.env',
    fastPreviewHealthUrl:
      readArg(argv, '--fast-preview-health-url') || 'http://127.0.0.1:4173/',
    fastPreviewPublicUrl:
      readArg(argv, '--fast-preview-url') || readArg(argv, '--preview-url') || 'http://127.0.0.1:4173',
    previewRoot: readArg(argv, '--preview-root') || '/srv/kb-docs-preview',
    productionPublishEnabled: argv.includes('--enable-production-publish'),
    stableBuildDebounceMs: readArg(argv, '--stable-build-debounce-ms') || '8000',
    stablePreviewPublicUrl:
      readArg(argv, '--stable-preview-url') || 'http://127.0.0.1:4175',
    stablePreviewStatusUrl:
      readArg(argv, '--stable-preview-status-url') ||
      readArg(argv, '--preview-status-url') ||
      'http://127.0.0.1:4175/__preview/status',
    secureCookie: argv.includes('--secure-cookie'),
    serviceGroup: readArg(argv, '--group') || serviceUser,
    serviceUser,
    updateLockTimeoutMs: readArg(argv, '--lock-timeout') || '180000',
  })
  console.log(JSON.stringify(manifest, null, 2))
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
