import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  baselineManifestPath,
  buildManifest,
  saveBaselineManifest
} from './kooboo-manifest.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const skipBuild = process.argv.includes('--skip-build')

async function runBuild() {
  const { spawn } = await import('node:child_process')

  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['docs:build:kooboo'], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`pnpm docs:build:kooboo exited with code ${code}`))
    })
  })
}

async function main() {
  if (!skipBuild) {
    console.log('Building VitePress and exporting to kb-remote-site...')
    await runBuild()
  }

  const manifest = await buildManifest()
  await saveBaselineManifest(manifest, baselineManifestPath)

  console.log('')
  console.log(`Refreshed shared manifest: ${path.relative(projectRoot, baselineManifestPath)}`)
  console.log(`  files: ${manifest.fileCount ?? Object.keys(manifest.files).length}`)
  console.log('  Commit this file so teammates share the same deploy baseline.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
