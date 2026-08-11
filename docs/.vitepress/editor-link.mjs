function normalizeEditorBaseUrl(value) {
  const input = String(value || '').trim()
  if (!input) return null

  const url = new URL(input)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('DOCS_EDITOR_BASE_URL must use http or https')
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('DOCS_EDITOR_BASE_URL must not contain credentials, query, or hash')
  }

  url.pathname = url.pathname.replace(/\/+$/u, '') || '/'
  return url
}

export function createEditorUrl(baseUrlValue, filePath) {
  const baseUrl = normalizeEditorBaseUrl(baseUrlValue)
  if (!baseUrl) return null

  const normalizedFilePath = String(filePath || '')
    .replace(/\\/gu, '/')
    .replace(/^\/+|\/+$/gu, '')
  if (!normalizedFilePath) throw new Error('VitePress filePath is required')

  const target = new URL(baseUrl.toString())
  target.searchParams.set('path', `docs/${normalizedFilePath}`)
  return target.toString()
}

export function createEditLinkConfig(baseUrlValue, text) {
  const baseUrl = normalizeEditorBaseUrl(baseUrlValue)
  if (!baseUrl) return undefined
  const serializedBaseUrl = JSON.stringify(baseUrl.toString())
  return {
    text,
    pattern: new Function(
      'payload',
      `
        const filePath = String(payload && payload.filePath || '')
          .replace(/\\\\/g, '/')
          .replace(/^\\/+|\\/+$/g, '')
        if (!filePath) throw new Error('VitePress filePath is required')
        const target = new URL(${serializedBaseUrl})
        target.searchParams.set('path', 'docs/' + filePath)
        return target.toString()
      `
    ),
  }
}
