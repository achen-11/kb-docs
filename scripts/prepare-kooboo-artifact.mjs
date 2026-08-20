import { spawn } from 'node:child_process'
import { execFileSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildManifest,
  getGitDeployMeta,
  koobooSiteDir,
  manifestRoots,
  projectRoot
} from './kooboo-manifest.mjs'

function readArg(argv, name) {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
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

async function pathExists(targetPath) {
  try {
    await stat(targetPath)
    return true
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return false
    throw error
  }
}

function canonicalPath(targetPath) {
  try {
    return realpathSync(path.resolve(targetPath))
  } catch (error) {
    if (error?.code === 'ENOENT') return path.resolve(targetPath)
    throw error
  }
}

export function assertArtifactGitRoot(artifactDir, sourceRoot = projectRoot, generatedSiteDir = koobooSiteDir) {
  const resolved = canonicalPath(artifactDir)
  const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: resolved,
    encoding: 'utf-8'
  }).trim()
  if (canonicalPath(gitRoot) !== resolved) {
    throw new Error(`Artifact directory must be the Git worktree root: ${resolved}`)
  }
  if (resolved === canonicalPath(sourceRoot) || resolved === canonicalPath(generatedSiteDir)) {
    throw new Error('Artifact directory must be a separate Git worktree')
  }
  const artifactCommonDir = canonicalPath(path.resolve(
    resolved,
    execFileSync('git', ['rev-parse', '--git-common-dir'], {
      cwd: resolved,
      encoding: 'utf-8'
    }).trim()
  ))
  const sourceCommonDir = canonicalPath(path.resolve(
    sourceRoot,
    execFileSync('git', ['rev-parse', '--git-common-dir'], {
      cwd: sourceRoot,
      encoding: 'utf-8'
    }).trim()
  ))
  if (artifactCommonDir !== sourceCommonDir) {
    throw new Error('Artifact directory must be a worktree of the kb-docs Git repository')
  }
  return resolved
}

export async function syncArtifactResources({ sourceDir, artifactDir }) {
  const copied = []
  for (const root of manifestRoots) {
    const sourcePath = path.join(sourceDir, root)
    const targetPath = path.join(artifactDir, root)
    await rm(targetPath, { recursive: true, force: true })
    if (!(await pathExists(sourcePath))) continue
    await mkdir(path.dirname(targetPath), { recursive: true })
    await cp(sourcePath, targetPath, { recursive: true, force: true })
    copied.push(root)
  }

  for (const fileName of ['.pushignore', '.env.example']) {
    const sourcePath = path.join(sourceDir, fileName)
    const targetPath = path.join(artifactDir, fileName)
    await rm(targetPath, { force: true })
    if (!(await pathExists(sourcePath))) continue
    await cp(sourcePath, targetPath, { force: true })
  }

  const gitignorePath = path.join(artifactDir, '.gitignore')
  const existingGitignore = (await pathExists(gitignorePath))
    ? await readFile(gitignorePath, 'utf-8')
    : ''
  const requiredIgnores = ['.env', '.kooboo/']
  const missingIgnores = requiredIgnores.filter(
    (item) => !existingGitignore.split(/\r?\n/).includes(item)
  )
  if (missingIgnores.length) {
    const prefix = existingGitignore && !existingGitignore.endsWith('\n') ? '\n' : ''
    await writeFile(
      gitignorePath,
      `${existingGitignore}${prefix}${missingIgnores.join('\n')}\n`,
      'utf-8'
    )
  }

  return copied
}

async function main() {
  const argv = process.argv.slice(2)
  const artifactDirValue =
    readArg(argv, '--artifact-dir') || process.env.KOOBOO_ARTIFACT_DIR
  if (!artifactDirValue) {
    throw new Error('Provide --artifact-dir or KOOBOO_ARTIFACT_DIR')
  }
  const artifactDir = assertArtifactGitRoot(artifactDirValue)

  if (!argv.includes('--skip-build')) {
    console.log('Building VitePress and exporting Kooboo resources...')
    await runCommand('pnpm', ['docs:build:kooboo'], projectRoot)
  }

  console.log(`Synchronizing generated resources to ${artifactDir}...`)
  const copiedRoots = await syncArtifactResources({
    sourceDir: koobooSiteDir,
    artifactDir
  })
  const manifest = await buildManifest(koobooSiteDir)
  const source = getGitDeployMeta()
  await writeFile(
    path.join(artifactDir, '.kooboo-artifact.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        sourceRepository: 'kb-docs',
        sourceCommit: source.gitCommit,
        sourceBranch: source.gitBranch,
        fileCount: Object.keys(manifest.files).length,
        roots: copiedRoots
      },
      null,
      2
    )}\n`,
    'utf-8'
  )

  console.log('Artifact worktree prepared.')
  console.log(`  roots: ${copiedRoots.join(', ') || 'none'}`)
  console.log(`  files: ${Object.keys(manifest.files).length}`)
  console.log('Review and commit the artifact worktree before deploying it.')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
