import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  baselineManifestPath,
  buildManifest,
  diffManifestFiles,
  koobooSiteDir,
  loadBaselineManifest,
  planPushTargets,
  saveBaselineManifest
} from './kooboo-manifest.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    skipBuild: argv.includes('--skip-build'),
    saveBaseline: !argv.includes('--no-save-baseline')
  }
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

function printSummary({ baseline, current, diff, pushPlan }) {
  const baselineCount = baseline ? Object.keys(baseline.files).length : 0
  const currentCount = Object.keys(current.files).length

  console.log('')
  console.log('Kooboo deploy manifest')
  const baselineLabel = baseline
    ? `git baseline, ${baseline.gitCommit?.slice(0, 7) ?? 'unknown'}@${baseline.gitBranch ?? '?'}`
    : 'missing — git pull or run docs:manifest:refresh'
  console.log(`  baseline : ${baseline ? baselineCount : 0} files (${baselineLabel})`)
  console.log(`  current  : ${currentCount} files`)
  console.log(`  added    : ${diff.added.length}`)
  console.log(`  modified : ${diff.modified.length}`)
  console.log(`  removed  : ${diff.removed.length}`)
  console.log(`  push ops : ${pushPlan.length}`)
  console.log('')
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (!options.skipBuild) {
    console.log('Building VitePress and exporting to kb-remote-site...')
    await runCommand('pnpm', ['docs:build:kooboo'], projectRoot)
  }

  console.log('Computing local manifest...')
  const current = await buildManifest()
  const baseline = await loadBaselineManifest()
  const diff = diffManifestFiles(baseline?.files, current.files)
  const pushPlan = planPushTargets(diff.changed)

  printSummary({ baseline, current, diff, pushPlan })

  if (diff.changed.length === 0) {
    console.log('Nothing to push.')
    return
  }

  if (diff.removed.length > 0) {
    console.log('Removed locally (not deleted on remote automatically):')
    for (const filePath of diff.removed.slice(0, 20)) {
      console.log(`  - ${filePath}`)
    }
    if (diff.removed.length > 20) {
      console.log(`  ... and ${diff.removed.length - 20} more`)
    }
    console.log('  Hint: kb check -o check-report.json && kb prune --report check-report.json')
    console.log('')
  }

  if (options.dryRun) {
    console.log('Dry run — push plan:')
    for (const item of pushPlan) {
      console.log(`  kb push ${item.target}${item.count > 1 ? `  (${item.count} files)` : ''}`)
    }
    return
  }

  for (const item of pushPlan) {
    console.log(`Pushing ${item.target}${item.count > 1 ? ` (${item.count} files)` : ''}...`)
    await runCommand('kb', ['push', item.target], koobooSiteDir)
  }

  if (options.saveBaseline) {
    await saveBaselineManifest(current, baselineManifestPath)
    console.log(`Updated shared manifest: ${path.relative(projectRoot, baselineManifestPath)}`)
    console.log('  Commit and push this file with your doc changes so the team shares deploy baseline.')
  }

  console.log('Deploy finished.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
