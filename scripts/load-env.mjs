/**
 * Load kb-docs/.env into process.env (does not override existing vars).
 * Supports KOOBOO_PASS / kooboo_pass, KOOBOO_USER / kooboo_user, etc.
 */
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(repoRoot, '.env')

if (existsSync(envPath)) {
const text = readFileSync(envPath, 'utf8')
for (const line of text.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  const key = trimmed.slice(0, eq).trim()
  let value = trimmed.slice(eq + 1).trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }
  const upper = key.toUpperCase()
  if (process.env[upper] === undefined) process.env[upper] = value
  if (process.env[key] === undefined) process.env[key] = value
}

if (!process.env.KOOBOO_PASS && process.env.kooboo_pass) {
  process.env.KOOBOO_PASS = process.env.kooboo_pass
}
if (!process.env.KOOBOO_USER && process.env.kooboo_user) {
  process.env.KOOBOO_USER = process.env.kooboo_user
}
}
