import path from 'node:path'
import { fileURLToPath } from 'node:url'

function readArg(argv, name) {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

function readPositiveInteger(value, fallback, name) {
  if (value === undefined) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return parsed
}

function defaultPreviewUrl() {
  const configuredHost = process.env.DOCS_PREVIEW_HOST || '127.0.0.1'
  const host = configuredHost === '0.0.0.0' ? '127.0.0.1' : configuredHost
  return `http://${host}:${process.env.DOCS_PREVIEW_PORT || '4173'}`
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function checkPreviewHealth({ baseUrl, timeoutMs, allowDegraded = false }) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/u, '')
  const statusResponse = await fetchWithTimeout(
    `${normalizedBaseUrl}/__preview/status`,
    { headers: { Accept: 'application/json' } },
    timeoutMs
  )
  if (!statusResponse.ok) {
    throw new Error(`Preview status returned HTTP ${statusResponse.status}`)
  }
  const status = await statusResponse.json()
  const acceptedStates = allowDegraded ? new Set(['ready', 'degraded']) : new Set(['ready'])
  if (!acceptedStates.has(status.status)) {
    throw new Error(`Preview status is ${status.status}: ${status.error || 'no error detail'}`)
  }
  if (!status.releaseId) throw new Error('Preview status has no releaseId')

  const pageResponse = await fetchWithTimeout(
    `${normalizedBaseUrl}/`,
    { method: 'HEAD' },
    timeoutMs
  )
  if (!pageResponse.ok) {
    throw new Error(`Preview root returned HTTP ${pageResponse.status}`)
  }

  return {
    baseUrl: normalizedBaseUrl,
    checkedAt: new Date().toISOString(),
    releaseId: status.releaseId,
    sourceCommit: status.sourceCommit || null,
    status: status.status
  }
}

async function main() {
  const argv = process.argv.slice(2)
  const baseUrl = readArg(argv, '--url') || process.env.DOCS_PREVIEW_URL || defaultPreviewUrl()
  const timeoutMs = readPositiveInteger(
    readArg(argv, '--timeout') || process.env.DOCS_PREVIEW_HEALTH_TIMEOUT_MS,
    5000,
    'preview health timeout'
  )
  const result = await checkPreviewHealth({
    allowDegraded: argv.includes('--allow-degraded'),
    baseUrl,
    timeoutMs
  })
  console.log(JSON.stringify(result, null, 2))
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
