/**
 * Save base64 PNG from cdp-bridge browser_screenshot to docs/public/cms/content/
 * Usage: node scripts/save-cdp-screenshot.mjs <filename.png> < base64.txt
 *    or: node scripts/save-cdp-screenshot.mjs <filename.png> "$(pbpaste)"
 */
import { mkdir, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(repoRoot, 'docs/public/cms/content')
const name = process.argv[2]
if (!name) {
  console.error('Usage: save-cdp-screenshot.mjs <filename.png> [base64-or-data-url]')
  process.exit(1)
}

let input = process.argv[3]
if (!input) {
  input = await new Promise((resolve, reject) => {
    const chunks = []
    process.stdin.on('data', (c) => chunks.push(c))
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    process.stdin.on('error', reject)
  })
}

let b64 = input.trim()
const m = b64.match(/"image"\s*:\s*"([^"]+)"/) || b64.match(/"data"\s*:\s*"([^"]+)"/)
if (m) b64 = m[1]
b64 = b64.replace(/^data:image\/\w+;base64,/, '').replace(/\s/g, '')

mkdir(outDir, { recursive: true }, () => {})
const outPath = path.join(outDir, name)
writeFileSync(outPath, Buffer.from(b64, 'base64'))
console.log('saved', outPath)
