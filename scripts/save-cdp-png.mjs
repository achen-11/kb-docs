/**
 * Save PNG from cdp-bridge MCP (browser_screenshot / browser_batch).
 *
 * Usage:
 *   node scripts/save-cdp-png.mjs <subdir> <filename.png> <response.json>
 *   node scripts/save-cdp-png.mjs <subdir> <filename.png>   # read stdin
 *
 * subdir: content | commerce | site | getting-started (under docs/public/cms/)
 */
import { mkdir, writeFileSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const [subdir, outName, inFile] = process.argv.slice(2)
if (!subdir || !outName) {
  console.error(
    'Usage: save-cdp-png.mjs <subdir> <filename.png> [response.json]'
  )
  process.exit(1)
}

let raw = ''
if (inFile) {
  raw = readFileSync(inFile, 'utf8')
} else {
  raw = readFileSync(0, 'utf8')
}

let b64 =
  (() => {
    try {
      const j = JSON.parse(raw)
      if (j.results?.[0]?.data) return j.results[0].data
      if (j.data) return j.data
      if (j.image) return j.image
      if (typeof j.result === 'string') {
        try {
          const inner = JSON.parse(j.result)
          return inner.data || inner.image || inner.results?.[0]?.data
        } catch {
          const m = j.result.match(/"data"\s*:\s*"([^"]+)"/)
          if (m) return m[1]
        }
      }
    } catch {
      /* fall through */
    }
    const m =
      raw.match(/"data"\s*:\s*"([^"]+)"/) || raw.match(/"image"\s*:\s*"([^"]+)"/)
    return m?.[1]
  })() || ''

b64 = String(b64)
  .replace(/^data:image\/\w+;base64,/, '')
  .replace(/\s/g, '')

if (!b64) {
  console.error('No base64 PNG in input')
  process.exit(1)
}

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(repoRoot, 'docs/public/cms', subdir)
mkdir(outDir, { recursive: true }, () => {})
const outPath = path.join(outDir, outName)
writeFileSync(outPath, Buffer.from(b64, 'base64'))
console.log('saved', outPath)
