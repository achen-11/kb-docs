import path from 'node:path'
import { fileURLToPath } from 'node:url'

function readArg(argv, name) {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

async function main() {
  const argv = process.argv.slice(2)
  const baseUrl = (
    readArg(argv, '--url') ||
    `http://127.0.0.1:${process.env.DOCS_EDITOR_PORT || '4174'}`
  ).replace(/\/$/u, '')
  const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(3000) })
  if (!response.ok) throw new Error(`Editor health returned HTTP ${response.status}`)
  const payload = await response.json()
  if (payload.status !== 'ready' || payload.mode !== 'draft') {
    throw new Error(`Editor health is invalid: ${JSON.stringify(payload)}`)
  }
  console.log(JSON.stringify({ baseUrl, checkedAt: new Date().toISOString(), ...payload }, null, 2))
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
