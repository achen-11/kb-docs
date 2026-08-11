import path from 'node:path'
import { fileURLToPath } from 'node:url'

function readArg(argv, name) {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

function readPositiveInteger(value, fallback) {
  if (value === undefined) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error('fast preview timeout must be a positive integer')
  return parsed
}

function defaultUrl() {
  const configuredHost = process.env.DOCS_PREVIEW_HOST || '127.0.0.1'
  const host = configuredHost === '0.0.0.0' ? '127.0.0.1' : configuredHost
  return `http://${host}:${process.env.DOCS_PREVIEW_FAST_PORT || '4173'}/`
}

export async function checkFastPreview({ url, timeoutMs = 5_000 }) {
  const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(timeoutMs) })
  if (!response.ok) throw new Error(`Fast preview returned HTTP ${response.status}`)
  return { checkedAt: new Date().toISOString(), status: 'ready', url: response.url || url }
}

async function main() {
  const argv = process.argv.slice(2)
  const result = await checkFastPreview({
    url: readArg(argv, '--url') || process.env.DOCS_FAST_PREVIEW_URL || defaultUrl(),
    timeoutMs: readPositiveInteger(readArg(argv, '--timeout'), 5_000),
  })
  console.log(JSON.stringify(result, null, 2))
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
