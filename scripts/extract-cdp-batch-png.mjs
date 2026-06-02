/**
 * Extract PNG from cdp-bridge browser_batch capture output JSON file.
 * Usage: node scripts/extract-cdp-batch-png.mjs <batch-result.json> <out.png>
 */
import { mkdir, writeFileSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const [inFile, outName] = process.argv.slice(2)
if (!inFile || !outName) {
  console.error('Usage: extract-cdp-batch-png.mjs <json-file> <filename.png>')
  process.exit(1)
}

const raw = readFileSync(inFile, 'utf8')
const j = JSON.parse(raw)
const b64 = j.results?.[0]?.data
if (!b64) {
  console.error('No results[0].data in', inFile)
  process.exit(1)
}

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(repoRoot, 'docs/public/cms/content')
mkdir(outDir, { recursive: true }, () => {})
const outPath = path.join(outDir, outName)
writeFileSync(outPath, Buffer.from(b64, 'base64'))
console.log('saved', outPath)
