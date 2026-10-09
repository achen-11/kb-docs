export const DOCS_ORIGIN = 'https://docs.kooboo.com'

export function canonicalDocPath(relativePath) {
  const route = relativePath.replace(/^\/+/, '').replace(/\.md$/, '.html')
  return route === 'index.html' ? '/' : `/${route}`
}

function plainText(value) {
  return value.replace(/`([^`]+)`/g, (_match, code) => code.replace(/[<>]/g, ''))
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '').replace(/[*`]/g, '')
    .replace(/\s+/g, ' ').trim()
}

export function createDocSeo(pageData, source) {
  const route = pageData.relativePath.replace(/^en\//, '')
  const section = route.startsWith('cms/') ? 'Admin CMS'
    : route.startsWith('api/') ? 'KScript API'
    : route.startsWith('templateEngine/') ? 'Template Engine'
    : 'Documentation'
  const title = plainText(pageData.title)
  const parent = route.split('/').slice(1, -1).filter(Boolean)
    .map((part) => part.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()))
    .join(' / ')
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
    .replace(/```[\s\S]*?```/g, '')
  const quote = body.match(/^>\s+(.+)$/m)?.[1]
  const paragraph = body.split(/\r?\n\s*\r?\n/).find((block) => {
    const text = block.trim()
    return text && !/^(?:#|\||<|>|!\[|[-*]\s|\d+\.)/.test(text)
  })
  const usefulQuote = quote && !/^(?:Menu|Tab|Group|Open from|Create|Folder|Route|Path|URL|Entry)\s*:/i.test(quote)
  const summary = plainText(usefulQuote && plainText(quote).length >= 60 ? quote : paragraph || quote || '')
  const contextualSummary = summary.length < 80 ? `${title} in Kooboo: ${summary}` : summary
  const description = (pageData.frontmatter.description || (contextualSummary.length > 190
    ? `${contextualSummary.slice(0, 187).replace(/\s+\S*$/, '')}…`
    : contextualSummary)).replaceAll('{', '[').replaceAll('}', ']')
  if (!summary && !pageData.frontmatter.description) throw new Error(`Missing SEO description: ${route}`)
  const defaultTitle = [title, parent, section].filter(Boolean).join(' | ')
  return {
    title: pageData.frontmatter.title || defaultTitle,
    description,
    canonical: `${DOCS_ORIGIN}${canonicalDocPath(route)}`,
  }
}
