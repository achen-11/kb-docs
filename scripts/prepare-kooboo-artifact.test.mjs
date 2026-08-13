import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { syncArtifactResources } from './prepare-kooboo-artifact.mjs'

test('syncArtifactResources mirrors deployment roots and removes stale files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-docs-artifact-'))
  const sourceDir = path.join(root, 'source')
  const artifactDir = path.join(root, 'artifact')
  try {
    await mkdir(path.join(sourceDir, 'src/js'), { recursive: true })
    await mkdir(path.join(sourceDir, 'images'), { recursive: true })
    await mkdir(path.join(artifactDir, 'src/js'), { recursive: true })
    await mkdir(path.join(artifactDir, 'src/css'), { recursive: true })
    await writeFile(path.join(sourceDir, 'src/js/app.js'), 'new')
    await writeFile(path.join(sourceDir, 'images/logo.png'), 'image')
    await writeFile(path.join(sourceDir, '.pushignore'), '*.tmp\n')
    await writeFile(path.join(sourceDir, '.env'), 'KOOBOO_PASSWORD=secret\n')
    await writeFile(path.join(artifactDir, 'src/js/stale.js'), 'stale')
    await writeFile(path.join(artifactDir, 'src/css/removed.css'), 'removed')
    await writeFile(path.join(artifactDir, '.env.example'), 'stale')

    const copied = await syncArtifactResources({ sourceDir, artifactDir })

    assert.deepEqual(copied, ['src/js', 'images'])
    assert.equal(await readFile(path.join(artifactDir, 'src/js/app.js'), 'utf-8'), 'new')
    await assert.rejects(readFile(path.join(artifactDir, 'src/js/stale.js'), 'utf-8'))
    await assert.rejects(readFile(path.join(artifactDir, 'src/css/removed.css'), 'utf-8'))
    assert.match(await readFile(path.join(artifactDir, '.gitignore'), 'utf-8'), /^\.env$/m)
    assert.match(await readFile(path.join(artifactDir, '.gitignore'), 'utf-8'), /^\.kooboo\/$/m)
    await assert.rejects(readFile(path.join(artifactDir, '.env'), 'utf-8'))
    await assert.rejects(readFile(path.join(artifactDir, '.env.example'), 'utf-8'))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
