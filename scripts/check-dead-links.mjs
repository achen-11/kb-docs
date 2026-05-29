/**
 * Scan internal links in docs/ and sidebar links in .vitepress/config.mts.
 * Usage: node scripts/check-dead-links.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const docsDir = path.join(root, 'docs')
const configPath = path.join(docsDir, '.vitepress/config.mts')

const LINK_RE = /!?\[([^\]]*)\]\(([^)#\s]+)(#[^)]*)?\)/g
const SIDEBAR_LINK_RE = /link:\s*['"]([^'"]+)['"]/g

/** @type {Map<string, string>} rewrite source -> target (relative to docs/) */
function loadRewrites() {
  const text = fs.readFileSync(configPath, 'utf8')
  const rewrites = new Map()
  const block = text.match(/rewrites:\s*\{([^}]+)\}/s)
  if (!block) return rewrites
  for (const m of block[1].matchAll(/'([^']+)':\s*'([^']+)'/g)) {
    rewrites.set(m[1], m[2])
  }
  return rewrites
}

const rewrites = loadRewrites()

function existsDoc(relativePath) {
  const normalized = relativePath.replace(/^\//, '').replace(/\/$/, '')
  const candidates = [
    normalized,
    `${normalized}.md`,
    path.join(normalized, 'index.md'),
  ]
  for (const c of candidates) {
    const full = path.join(docsDir, c)
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return true
  }
  return false
}

/** Resolve vitepress-style path to docs-relative file check */
function resolveInternal(href, fromFile) {
  if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) {
    return null
  }
  if (href.startsWith('/')) {
    let rel = href.slice(1)
    if (rel.endsWith('/')) rel = `${rel}index.md`
    else if (!rel.endsWith('.md') && !rel.includes('.')) rel = `${rel}.md`
    return rel
  }
  const fromDir = path.dirname(path.relative(docsDir, fromFile))
  let resolved = path.normalize(path.join(fromDir, href))
  if (resolved.endsWith('/')) resolved = `${resolved}index.md`
  else if (!path.extname(resolved)) resolved = `${resolved}.md`
  return resolved
}

function checkHref(href, fromFile, label) {
  const rel = resolveInternal(href, fromFile)
  if (!rel) return null
  if (existsDoc(rel)) return null
  const rewritten = rewrites.get(rel.replace(/\.md$/, '').replace(/\/index$/, ''))
  if (rewritten && existsDoc(rewritten)) return null
  return { href, resolved: rel, from: path.relative(root, fromFile), label }
}

function collectMarkdownFiles(dir) {
  /** @type {string[]} */
  const out = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.') || ent.name === 'node_modules') continue
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) out.push(...collectMarkdownFiles(full))
    else if (ent.name.endsWith('.md')) out.push(full)
  }
  return out
}

const dead = []
const legacyPatterns = [
  { re: /\/api\/core\//, name: 'api/core/' },
  { re: /\/api\/data\//, name: 'api/data/' },
  { re: /\/api\/business\//, name: 'api/business/' },
  { re: /\.\.\/core\//, name: '../core/' },
  { re: /\.\.\/data\//, name: '../data/' },
  { re: /\.\.\/business\//, name: '../business/' },
  { re: /site\/k-page/, name: 'site/k-page' },
  { re: /site\/site\.md/, name: 'site/site.md' },
  { re: /logger\/k-logger/, name: 'logger/k-logger' },
]

const legacyHits = []

for (const file of collectMarkdownFiles(docsDir)) {
  if (file.includes(`${path.sep}superpowers${path.sep}`)) continue
  const text = fs.readFileSync(file, 'utf8')
  for (const { re, name } of legacyPatterns) {
    if (re.test(text)) legacyHits.push({ pattern: name, file: path.relative(root, file) })
  }
  let m
  LINK_RE.lastIndex = 0
  while ((m = LINK_RE.exec(text)) !== null) {
    const issue = checkHref(m[2], file, m[1])
    if (issue) dead.push(issue)
  }
}

const configText = fs.readFileSync(configPath, 'utf8')
let sm
SIDEBAR_LINK_RE.lastIndex = 0
while ((sm = SIDEBAR_LINK_RE.exec(configText)) !== null) {
  const issue = checkHref(sm[1], configPath, 'sidebar')
  if (issue) {
    issue.from = '.vitepress/config.mts (sidebar)'
    dead.push(issue)
  }
}

const navLinkRe = /link:\s*['"]([^'"]+)['"]/g
// already covered by sidebar regex for nav too

const apiDead = dead.filter((d) => d.from.startsWith('docs/api/') || d.from.includes('config.mts'))
const otherDead = dead.filter((d) => !apiDead.includes(d))

function printDead(title, items) {
  console.log(`=== ${title} ===\n`)
  if (items.length === 0) {
    console.log('None.\n')
    return
  }
  console.log(`Found ${items.length} broken link(s):\n`)
  for (const d of items) {
    console.log(`  ${d.from}`)
    console.log(`    → ${d.href}  (resolved: ${d.resolved})\n`)
  }
}

printDead('API / sidebar dead links (must be empty)', apiDead)
printDead('Other sections (placeholders / pending pages)', otherDead)

console.log('=== Legacy path patterns in docs/ (excl. superpowers/) ===\n')
if (legacyHits.length === 0) {
  console.log('None.\n')
} else {
  for (const h of legacyHits) {
    console.log(`  [${h.pattern}] ${h.file}`)
  }
  console.log()
}

process.exit(apiDead.length > 0 || legacyHits.length > 0 ? 1 : 0)
