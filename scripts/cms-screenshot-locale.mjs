import path from 'node:path'

const SCREENSHOT_LOCALES = {
  zh: {
    locale: 'zh',
    browserLocale: 'zh-CN',
    acceptLanguage: 'zh-CN,zh;q=0.9',
    cmsLangCookieValue: 'zh',
    publicDirSegments: ['docs', 'public', 'cms'],
  },
  en: {
    locale: 'en',
    browserLocale: 'en-US',
    acceptLanguage: 'en-US,en;q=0.9',
    cmsLangCookieValue: 'en',
    publicDirSegments: ['docs', 'public', 'en', 'cms'],
  },
}

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function normalizeCmsScreenshotLocale(locale = 'zh') {
  return String(locale).toLowerCase().startsWith('en') ? 'en' : 'zh'
}

export function getCmsScreenshotLocaleConfig(locale = process.env.KOOBOO_DOC_LOCALE || 'zh') {
  return SCREENSHOT_LOCALES[normalizeCmsScreenshotLocale(locale)]
}

export function resolveCmsScreenshotOutputDir(repoRoot, section, locale) {
  const config = getCmsScreenshotLocaleConfig(locale)
  return path.join(repoRoot, ...config.publicDirSegments, section)
}

export function getCmsBrowserContextOptions(locale) {
  const config = getCmsScreenshotLocaleConfig(locale)
  return {
    locale: config.browserLocale,
    extraHTTPHeaders: {
      'Accept-Language': config.acceptLanguage,
    },
  }
}

function getCmsApiUrl(baseUrl, pathname) {
  return new URL(`/_api/v2/${pathname.replace(/^\/+/, '')}`, baseUrl).toString()
}

function canRetryWithFreshPage(error) {
  const message = String(error?.message || error || '')
  return (
    message.includes('Execution context was destroyed') ||
    message.includes('Target page, context or browser has been closed') ||
    message.includes('Most likely the page has been closed') ||
    message.includes('Cannot find context with specified id')
  )
}

async function withCmsApiPage(page, context, baseUrl, callback) {
  try {
    return await callback(page)
  } catch (error) {
    if (!canRetryWithFreshPage(error)) {
      throw error
    }

    const fallbackPage = await context.newPage()
    try {
      await fallbackPage.goto(baseUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
      return await callback(fallbackPage)
    } finally {
      await fallbackPage.close().catch(() => {})
    }
  }
}

async function fetchCmsHeader(page, context, baseUrl) {
  const response = await withCmsApiPage(page, context, baseUrl, async (targetPage) =>
    targetPage.evaluate(async (url) => {
      const result = await fetch(url, {
        credentials: 'include',
      })
      if (!result.ok) {
        throw new Error(`Failed to load CMS header: ${result.status}`)
      }
      return result.json()
    }, getCmsApiUrl(baseUrl, 'bar/header'))
  )

  return response
}

async function changeCmsUserLanguage(page, context, baseUrl, language) {
  await withCmsApiPage(page, context, baseUrl, async (targetPage) =>
    targetPage.evaluate(
      async ({ url, language: nextLanguage }) => {
        const result = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
          },
          body: JSON.stringify({ language: nextLanguage }),
        })

        if (!result.ok) {
          throw new Error(`Failed to change CMS language: ${result.status}`)
        }
      },
      {
        url: getCmsApiUrl(baseUrl, 'user/ChangeLanguage'),
        language,
      }
    )
  )
}

async function setCmsLangCookie(context, baseUrl, language) {
  const { hostname } = new URL(baseUrl)

  await context.addCookies([
    {
      name: '_cms_lang',
      value: language,
      domain: hostname,
      path: '/',
    },
  ])
}

export async function applyCmsUiLanguage(page, context, baseUrl, locale) {
  const config = getCmsScreenshotLocaleConfig(locale)
  const previousLanguage = (await fetchCmsHeader(page, context, baseUrl))?.user?.language || null

  await setCmsLangCookie(context, baseUrl, config.cmsLangCookieValue)

  if (previousLanguage !== config.cmsLangCookieValue) {
    await changeCmsUserLanguage(page, context, baseUrl, config.cmsLangCookieValue)
  }

  return previousLanguage
}

export async function restoreCmsUiLanguage(page, context, baseUrl, previousLanguage) {
  if (!previousLanguage) return

  await setCmsLangCookie(context, baseUrl, previousLanguage)
  const currentLanguage = (await fetchCmsHeader(page, context, baseUrl))?.user?.language || null

  if (currentLanguage !== previousLanguage) {
    await changeCmsUserLanguage(page, context, baseUrl, previousLanguage)
  }
}

export function createTextPattern(values) {
  const items = Array.isArray(values) ? values : [values]
  return new RegExp(items.map(escapeForRegExp).join('|'), 'i')
}
