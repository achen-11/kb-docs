import { mkdir, readFile, writeFile } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
  return {
    appDir: assertAbsolutePath(input.appDir, 'app directory'),
    authTokenFile: assertAbsolutePath(
      input.authTokenFile || path.join(configDir, 'auth-token'),
      'auth token file'
    ),
    bindHost: assertBindHost(input.bindHost || '127.0.0.1'),
    configDir,
    editorPort: readPort(input.editorPort || '4174'),
    outputDir: path.resolve(input.outputDir),
    previewPublicUrl: assertHttpUrl(input.previewPublicUrl, 'preview public URL'),
    previewStatusUrl: assertHttpUrl(input.previewStatusUrl, 'preview status URL'),
    secureCookie: input.secureCookie ? 'true' : 'false',
    serviceGroup: assertSafeIdentity(input.serviceGroup, 'service group'),
    serviceUser: assertSafeIdentity(input.serviceUser, 'service user'),
  }
}

export async function renderDocsEditorConfig(input) {
  const config = normalizeDocsEditorConfig(input)
  const replacements = {
    APP_DIR: config.appDir,
    AUTH_TOKEN_FILE: config.authTokenFile,
    BIND_HOST: config.bindHost,
    CONFIG_DIR: config.configDir,
    EDITOR_PORT: config.editorPort,
    PREVIEW_PUBLIC_URL: config.previewPublicUrl,
    PREVIEW_STATUS_URL: config.previewStatusUrl,
    SECURE_COOKIE: config.secureCookie,
    SERVICE_GROUP: config.serviceGroup,
    SERVICE_USER: config.serviceUser,
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
    outputDir:
      readArg(argv, '--output-dir') || path.join(projectRoot, '.local-preview', 'editor-config'),
    previewPublicUrl: readArg(argv, '--preview-url') || 'http://127.0.0.1:4173',
    previewStatusUrl:
      readArg(argv, '--preview-status-url') || 'http://127.0.0.1:4173/__preview/status',
    secureCookie: argv.includes('--secure-cookie'),
    serviceGroup: readArg(argv, '--group') || serviceUser,
    serviceUser,
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
