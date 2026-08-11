import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  createBuildCoordinator,
  projectRoot,
  readPreviewStatus
} from './local-preview-server.mjs'

function readArg(argv, name) {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

function readPositiveInteger(value, fallback, name) {
  if (value === undefined) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return parsed
}

async function main() {
  const argv = process.argv.slice(2)
  const previewRoot = path.resolve(
    readArg(argv, '--root') ||
      process.env.DOCS_PREVIEW_ROOT ||
      path.join(projectRoot, '.local-preview')
  )
  const keepReleases = readPositiveInteger(
    process.env.DOCS_PREVIEW_KEEP_RELEASES,
    5,
    'DOCS_PREVIEW_KEEP_RELEASES'
  )
  const reason = readArg(argv, '--reason') || process.env.DOCS_PREVIEW_REASON || 'manual publish'
  const state = {
    status: 'starting',
    buildNumber: 0,
    buildReason: null,
    buildStartedAt: null,
    buildFinishedAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    releaseId: null,
    sourceCommit: null,
    sourceDirty: null,
    error: null
  }
  Object.assign(state, await readPreviewStatus(previewRoot, state))

  const coordinator = createBuildCoordinator({
    previewRoot,
    state,
    keepReleases,
    buildCommand: { command: 'corepack', args: ['pnpm', 'docs:build'] }
  })
  await coordinator.requestBuild(reason)

  const finalStatus = await readPreviewStatus(previewRoot, state)
  if (finalStatus.status !== 'ready') {
    throw new Error(finalStatus.error || `Preview publish ended in ${finalStatus.status} state`)
  }
  console.log(JSON.stringify(finalStatus, null, 2))
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
