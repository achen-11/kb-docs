import { spawn } from 'node:child_process'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function readArg(argv, name) {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

function assertGitRoot(artifactDir) {
  const resolved = path.resolve(artifactDir)
  const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: resolved,
    encoding: 'utf-8'
  }).trim()
  if (path.resolve(gitRoot) !== resolved) {
    throw new Error(`Artifact directory must be the Git worktree root: ${resolved}`)
  }
  const markerPath = path.join(resolved, '.kooboo-artifact.json')
  let marker
  try {
    marker = JSON.parse(readFileSync(markerPath, 'utf-8'))
  } catch {
    throw new Error(`Artifact metadata is missing or invalid: ${markerPath}`)
  }
  if (marker?.schemaVersion !== 1 || marker?.sourceRepository !== 'kb-docs') {
    throw new Error(`Artifact metadata does not identify a kb-docs artifact: ${markerPath}`)
  }
  return resolved
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
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

async function main() {
  const argv = process.argv.slice(2)
  const artifactDirValue =
    readArg(argv, '--artifact-dir') || process.env.KOOBOO_ARTIFACT_DIR
  const from = readArg(argv, '--from') || process.env.KOOBOO_DEPLOY_FROM
  const to = readArg(argv, '--to') || process.env.KOOBOO_DEPLOY_TO || 'HEAD'
  const plan = readArg(argv, '--plan')

  if (!artifactDirValue) {
    throw new Error('Provide --artifact-dir or KOOBOO_ARTIFACT_DIR')
  }
  if (!from && !plan) {
    throw new Error('Provide --from or KOOBOO_DEPLOY_FROM as the last successful artifact commit')
  }

  const artifactDir = assertGitRoot(artifactDirValue)
  const dryRun = argv.includes('--dry-run')
  const command = process.env.KOOBOO_CLI_BIN || 'kb'
  const commandArgs = ['deploy']
  if (plan) commandArgs.push('--plan', plan)
  else commandArgs.push('--from', from, '--to', to)
  commandArgs.push('--format', 'table')

  if (dryRun) {
    commandArgs.push(
      '--dry-run',
      '--write-plan',
      readArg(argv, '--write-plan') || '.kooboo/deploy-plan.json'
    )
  } else {
    commandArgs.push(
      '--output',
      readArg(argv, '--output') || '.kooboo/deploy-receipt.json'
    )
  }
  if (argv.includes('--apply-deletes')) commandArgs.push('--apply-deletes')
  if (argv.includes('--no-verify')) commandArgs.push('--no-verify')
  if (argv.includes('--exact')) commandArgs.push('--exact')
  if (argv.includes('--resume')) commandArgs.push('--resume')
  for (const option of [
    '--timeout',
    '--concurrency',
    '--interval-ms',
    '--page-retry-count',
    '--page-retry-delay-ms'
  ]) {
    const value = readArg(argv, option)
    if (value !== undefined) commandArgs.push(option, value)
  }

  await runCommand(command, commandArgs, artifactDir)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
