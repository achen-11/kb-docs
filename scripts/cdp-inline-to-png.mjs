/**
 * Save PNG from a one-line base64 file (cdp-bridge small screenshot responses).
 * Usage: node scripts/cdp-inline-to-png.mjs <subdir> <filename.png> <base64.txt>
 */
import { mkdir, writeFileSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const [subdir, outName, b64File] = process.argv.slice(2)
if (!subdir || !outName || !b64File) {
  console.error(
    'Usage: cdp-inline-to-png.mjs <subdir> <filename.png> <base64-one-line.txt>'
  )
  process.exit(1)
}

const b64 = readFileSync(b64File, 'utf8').trim()
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(repoRoot, 'docs/public/cms', subdir)
mkdir(outDir, { recursive: true }, () => {})
const outPath = path.join(outDir, outName)
writeFileSync(outPath, Buffer.from(b64, 'base64'))
console.log('saved', outPath)
