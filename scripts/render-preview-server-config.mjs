import { mkdir, readFile, writeFile } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const templatesDir = path.join(projectRoot, 'deploy', 'preview', 'templates')

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

function assertHostname(value) {
  if (
    value.length > 253 ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/iu.test(
      value
    )
  ) {
    throw new Error('preview hostname is invalid')
  }
  return value.toLowerCase()
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

function assertGitRemote(value) {
  if (!/^[A-Za-z0-9._-]+$/u.test(value)) {
    throw new Error('Git remote name contains unsupported characters')
  }
  return value
}

function assertGitBranch(value) {
  if (
    !value ||
    value.startsWith('-') ||
    value.startsWith('/') ||
    value.endsWith('/') ||
    value.endsWith('.') ||
    value.includes('..') ||
    value.includes('//') ||
    value.includes('@{') ||
    /[\s~^:?*\[\\\x00-\x1f\x7f]/u.test(value) ||
    value.split('/').some((part) => !part || part.startsWith('.') || part.endsWith('.lock'))
  ) {
    throw new Error('Git branch name is invalid')
  }
  return value
}

function readPositiveInteger(value, fallback, name, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return fallback
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
    throw new Error('Rendered configuration contains unresolved placeholders')
  }
  return rendered
}

export function normalizePreviewServerConfig(input) {
  return {
    appDir: assertAbsolutePath(input.appDir, 'app directory'),
    bindHost: assertBindHost(input.bindHost || '127.0.0.1'),
    configDir: assertAbsolutePath(input.configDir, 'config directory'),
    dataDir: assertAbsolutePath(input.dataDir, 'data directory'),
    gitBranch: assertGitBranch(input.gitBranch || 'main'),
    gitRemote: assertGitRemote(input.gitRemote || 'origin'),
    keepReleases: readPositiveInteger(input.keepReleases, 5, 'release retention', 100),
    outputDir: path.resolve(input.outputDir),
    previewHostname: assertHostname(input.previewHostname),
    previewPort: readPositiveInteger(input.previewPort, 4173, 'preview port', 65535),
    serviceGroup: assertSafeIdentity(input.serviceGroup, 'service group'),
    serviceUser: assertSafeIdentity(input.serviceUser, 'service user'),
    syncIntervalSeconds: readPositiveInteger(
      input.syncIntervalSeconds,
      30,
      'Git sync interval',
      86_400
    ),
    updateLockTimeoutMs: readPositiveInteger(
      input.updateLockTimeoutMs,
      180_000,
      'preview update lock timeout',
      3_600_000
    )
  }
}

export async function renderPreviewServerConfig(input) {
  const config = normalizePreviewServerConfig(input)
  const replacements = {
    APP_DIR: config.appDir,
    BIND_HOST: config.bindHost,
    CONFIG_DIR: config.configDir,
    DATA_DIR: config.dataDir,
    GIT_BRANCH: config.gitBranch,
    GIT_REMOTE: config.gitRemote,
    GIT_STATE_FILE: path.join(config.dataDir, '.git-sync-state.json'),
    KEEP_RELEASES: config.keepReleases,
    PREVIEW_HOSTNAME: config.previewHostname,
    PREVIEW_PORT: config.previewPort,
    SERVICE_GROUP: config.serviceGroup,
    SERVICE_USER: config.serviceUser,
    SYNC_INTERVAL_SECONDS: config.syncIntervalSeconds,
    UPDATE_LOCK_FILE: path.join(config.dataDir, '.update.lock'),
    UPDATE_LOCK_TIMEOUT_MS: config.updateLockTimeoutMs
  }
  const templateFiles = {
    'git-askpass.sh': 'git-askpass.sh.template',
    'kb-docs-preview.nginx.conf': 'nginx.conf.template',
    'kb-docs-preview.service': 'kb-docs-preview.service.template',
    'kb-docs-preview-sync.service': 'kb-docs-preview-sync.service.template',
    'kb-docs-preview-sync.timer': 'kb-docs-preview-sync.timer.template',
    'preview.env': 'preview.env.template'
  }

  await mkdir(config.outputDir, { recursive: true })
  for (const [outputName, templateName] of Object.entries(templateFiles)) {
    const template = await readFile(path.join(templatesDir, templateName), 'utf-8')
    await writeFile(
      path.join(config.outputDir, outputName),
      renderTemplate(template, replacements),
      { encoding: 'utf-8', mode: outputName === 'git-askpass.sh' ? 0o750 : 0o640 }
    )
  }
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    ...config
  }
  await writeFile(
    path.join(config.outputDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf-8'
  )
  return manifest
}

async function main() {
  const argv = process.argv.slice(2)
  const serviceUser = readArg(argv, '--user') || 'kb-docs-preview'
  const manifest = await renderPreviewServerConfig({
    appDir: readArg(argv, '--app-dir') || '/opt/kb-docs',
    bindHost: readArg(argv, '--bind-host') || '127.0.0.1',
    configDir: readArg(argv, '--config-dir') || '/etc/kb-docs-preview',
    dataDir: readArg(argv, '--data-dir') || '/srv/kb-docs-preview',
    gitBranch: readArg(argv, '--git-branch') || 'main',
    gitRemote: readArg(argv, '--git-remote') || 'origin',
    keepReleases: readArg(argv, '--keep-releases') || '5',
    outputDir:
      readArg(argv, '--output-dir') || path.join(projectRoot, '.local-preview', 'server-config'),
    previewHostname: readArg(argv, '--hostname') || 'docs-preview.kbdev.com',
    previewPort: readArg(argv, '--port') || '4173',
    serviceGroup: readArg(argv, '--group') || serviceUser,
    serviceUser,
    syncIntervalSeconds: readArg(argv, '--sync-interval') || '30',
    updateLockTimeoutMs: readArg(argv, '--lock-timeout') || '180000'
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
