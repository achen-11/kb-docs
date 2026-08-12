import { appendFile, link, mkdir, open, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

import { withPreviewLock } from './run-with-preview-lock.mjs'

export const DEFAULT_MAX_MEDIA_BYTES = 8 * 1024 * 1024
const MEDIA_ROOTS = ['cms', 'product', 'en/cms', 'en/product']
const MIME_BY_EXTENSION = new Map([
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
])

export class MediaOperationError extends Error {
  constructor(statusCode, code, message) {
    super(message)
    this.name = 'MediaOperationError'
    this.statusCode = statusCode
    this.code = code
  }
}

function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function assertSafeSegments(value, message) {
  if (
    typeof value !== 'string' || !value || value.length > 512 || value.includes('\0') || value.includes('\\') ||
    path.posix.isAbsolute(value) || path.posix.normalize(value) !== value ||
    value.split('/').some((segment) => !segment || segment === '..' || segment.startsWith('.'))
  ) throw new MediaOperationError(400, 'INVALID_MEDIA_PATH', message)
  return value
}

export function normalizeMediaDirectory(value) {
  const normalized = assertSafeSegments(value, '图片目录不合法。')
  if (!MEDIA_ROOTS.some((root) => normalized === root || normalized.startsWith(`${root}/`))) {
    throw new MediaOperationError(400, 'INVALID_MEDIA_DIRECTORY', '只能上传到 cms、product、en/cms 或 en/product。')
  }
  return normalized
}

export function normalizeMediaPath(value) {
  const normalized = assertSafeSegments(value, '图片路径不合法。')
  if (!normalized.startsWith('docs/public/')) {
    throw new MediaOperationError(400, 'INVALID_MEDIA_PATH', '图片必须位于 docs/public。')
  }
  const publicPath = normalized.slice('docs/public/'.length)
  normalizeMediaDirectory(path.posix.dirname(publicPath))
  const extension = path.posix.extname(publicPath).toLowerCase()
  if (!MIME_BY_EXTENSION.has(extension)) {
    throw new MediaOperationError(400, 'UNSUPPORTED_MEDIA_TYPE', '仅支持 PNG、JPEG、WebP 和 GIF。')
  }
  return normalized
}

function normalizeFileName(value) {
  const fileName = assertSafeSegments(value, '图片文件名不合法。')
  if (fileName.includes('/')) throw new MediaOperationError(400, 'INVALID_MEDIA_NAME', '图片文件名不能包含目录。')
  if (!/^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u.test(fileName)) {
    throw new MediaOperationError(400, 'INVALID_MEDIA_NAME', '文件名只能包含文字、数字、点、短横线和下划线。')
  }
  return fileName
}

function publicUrl(repoPath) {
  return `/${repoPath.slice('docs/public/'.length)}`
}

function detectMime(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png'
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  const signature = buffer.subarray(0, 6).toString('ascii')
  if (signature === 'GIF87a' || signature === 'GIF89a') return 'image/gif'
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  return null
}

async function writeJsonAtomically(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true })
  const temporaryFile = `${filePath}.${process.pid}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryFile, `${JSON.stringify(payload, null, 2)}\n`, { encoding: 'utf8', mode: 0o640 })
    await rename(temporaryFile, filePath)
  } finally {
    await rm(temporaryFile, { force: true })
  }
}

async function appendAudit(auditLog, event) {
  await mkdir(path.dirname(auditLog), { recursive: true })
  await appendFile(auditLog, `${JSON.stringify({ schemaVersion: 1, ...event })}\n`, { encoding: 'utf8', mode: 0o640 })
}

async function markDraft(draftStateFile, mediaPath, savedAt) {
  let current = {}
  try { current = JSON.parse(await readFile(draftStateFile, 'utf8')) } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  await writeJsonAtomically(draftStateFile, {
    ...current,
    schemaVersion: 1,
    active: true,
    updatedAt: savedAt,
    lastAsset: mediaPath,
  })
}

async function walkMedia(directory, repoPrefix, result) {
  let entries = []
  try { entries = await readdir(directory, { withFileTypes: true }) } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue
    const absolutePath = path.join(directory, entry.name)
    const repoPath = `${repoPrefix}/${entry.name}`
    if (entry.isDirectory()) await walkMedia(absolutePath, repoPath, result)
    else if (entry.isFile() && MIME_BY_EXTENSION.has(path.extname(entry.name).toLowerCase())) {
      const metadata = await stat(absolutePath)
      result.push({ path: repoPath, url: publicUrl(repoPath), name: entry.name, bytes: metadata.size, modifiedAt: metadata.mtime.toISOString() })
    }
  }
}

async function walkMarkdown(directory, repoPrefix, visitor) {
  let entries = []
  try { entries = await readdir(directory, { withFileTypes: true }) } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue
    const absolutePath = path.join(directory, entry.name)
    const repoPath = `${repoPrefix}/${entry.name}`
    if (entry.isDirectory()) await walkMarkdown(absolutePath, repoPath, visitor)
    else if (entry.isFile() && entry.name.endsWith('.md')) await visitor(absolutePath, repoPath)
  }
}

export function createMediaCoordinator({ projectRoot, draftStateFile, auditLog, lockFile, lockTimeoutMs = 180_000, maximumBytes = DEFAULT_MAX_MEDIA_BYTES }) {
  const publicRoot = path.resolve(projectRoot, 'docs/public')

  async function resolveExisting(mediaPath) {
    const normalizedPath = normalizeMediaPath(mediaPath)
    const candidate = path.resolve(projectRoot, normalizedPath)
    if (!isPathInside(publicRoot, candidate)) throw new MediaOperationError(400, 'INVALID_MEDIA_PATH', '图片路径超出 docs/public。')
    let resolved
    try { resolved = await realpath(candidate) } catch (error) {
      if (error?.code === 'ENOENT') throw new MediaOperationError(404, 'MEDIA_NOT_FOUND', '图片不存在。')
      throw error
    }
    const resolvedPublicRoot = await realpath(publicRoot)
    if (!isPathInside(resolvedPublicRoot, resolved)) throw new MediaOperationError(400, 'INVALID_MEDIA_PATH', '图片路径越界。')
    const metadata = await stat(resolved)
    if (!metadata.isFile()) throw new MediaOperationError(404, 'MEDIA_NOT_FOUND', '图片不存在。')
    return { normalizedPath, resolved, metadata }
  }

  return {
    async list({ root = '', search = '', page = 1, pageSize = 48 } = {}) {
      const normalizedRoot = root ? normalizeMediaDirectory(root) : ''
      const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1
      const normalizedPageSize = Number.isInteger(pageSize) ? Math.min(96, Math.max(12, pageSize)) : 48
      const files = []
      const roots = normalizedRoot ? [normalizedRoot] : MEDIA_ROOTS
      for (const mediaRoot of roots) {
        await walkMedia(path.join(publicRoot, mediaRoot), `docs/public/${mediaRoot}`, files)
      }
      const needle = String(search || '').trim().toLocaleLowerCase('zh-CN')
      const filtered = needle ? files.filter((item) => item.path.toLocaleLowerCase('zh-CN').includes(needle)) : files
      filtered.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt) || left.path.localeCompare(right.path))
      const offset = (normalizedPage - 1) * normalizedPageSize
      const folders = [...new Set(filtered.map((item) => path.posix.dirname(item.path.slice('docs/public/'.length))))].sort()
      return { items: filtered.slice(offset, offset + normalizedPageSize), total: filtered.length, page: normalizedPage, pageSize: normalizedPageSize, folders, roots: MEDIA_ROOTS }
    },
    async content(mediaPath) {
      const resolved = await resolveExisting(mediaPath)
      return { ...resolved, body: await readFile(resolved.resolved), contentType: MIME_BY_EXTENSION.get(path.extname(resolved.normalizedPath).toLowerCase()) }
    },
    async references(mediaPath) {
      const { normalizedPath } = await resolveExisting(mediaPath)
      const url = publicUrl(normalizedPath)
      const references = []
      await walkMarkdown(path.join(projectRoot, 'docs'), 'docs', async (absolutePath, repoPath) => {
        const content = await readFile(absolutePath, 'utf8')
        let index = content.indexOf(url)
        if (index < 0) return
        const line = content.slice(0, index).split('\n').length
        references.push({ path: repoPath, line })
      })
      return { path: normalizedPath, url, references }
    },
    async upload({ directory, fileName, contentBase64, actor }) {
      const normalizedDirectory = normalizeMediaDirectory(directory)
      const normalizedName = normalizeFileName(fileName)
      const extension = path.extname(normalizedName).toLowerCase()
      const expectedMime = MIME_BY_EXTENSION.get(extension)
      if (!expectedMime) throw new MediaOperationError(400, 'UNSUPPORTED_MEDIA_TYPE', '仅支持 PNG、JPEG、WebP 和 GIF。')
      if (typeof contentBase64 !== 'string' || !contentBase64 || contentBase64.length > Math.ceil(maximumBytes * 4 / 3) + 8) {
        throw new MediaOperationError(413, 'MEDIA_TOO_LARGE', `图片不能超过 ${maximumBytes} 字节。`)
      }
      const body = Buffer.from(contentBase64, 'base64')
      if (!body.length || body.length > maximumBytes || body.toString('base64').replace(/=+$/u, '') !== contentBase64.replace(/=+$/u, '')) {
        throw new MediaOperationError(400, 'INVALID_MEDIA_CONTENT', '图片内容不是有效的 Base64 数据。')
      }
      if (detectMime(body) !== expectedMime) throw new MediaOperationError(400, 'MEDIA_TYPE_MISMATCH', '文件扩展名与真实图片格式不一致。')
      const repoPath = `docs/public/${normalizedDirectory}/${normalizedName}`
      const destination = path.resolve(projectRoot, repoPath)
      if (!isPathInside(publicRoot, destination)) throw new MediaOperationError(400, 'INVALID_MEDIA_PATH', '图片路径越界。')
      return withPreviewLock({ lockFile, timeoutMs: lockTimeoutMs }, async () => {
        await mkdir(path.dirname(destination), { recursive: true })
        const [resolvedPublicRoot, resolvedDirectory] = await Promise.all([realpath(publicRoot), realpath(path.dirname(destination))])
        if (!isPathInside(resolvedPublicRoot, resolvedDirectory)) {
          throw new MediaOperationError(400, 'INVALID_MEDIA_PATH', '图片目录通过符号链接越界。')
        }
        const temporaryFile = path.join(path.dirname(destination), `.${normalizedName}.${process.pid}.${randomUUID()}.tmp`)
        let handle
        try {
          handle = await open(temporaryFile, 'wx', 0o640)
          await handle.writeFile(body)
          await handle.sync()
          await handle.close()
          handle = undefined
          try { await link(temporaryFile, destination) } catch (error) {
            if (error?.code === 'EEXIST') throw new MediaOperationError(409, 'MEDIA_EXISTS', '同名图片已经存在，请修改文件名。')
            throw error
          }
        } finally {
          await handle?.close().catch(() => undefined)
          await rm(temporaryFile, { force: true })
        }
        const savedAt = new Date().toISOString()
        await markDraft(draftStateFile, repoPath, savedAt)
        await appendAudit(auditLog, { at: savedAt, actor, path: repoPath, bytes: body.length, outcome: 'media_uploaded' })
        return { path: repoPath, url: publicUrl(repoPath), name: normalizedName, bytes: body.length, modifiedAt: savedAt }
      })
    },
  }
}
