export interface EditorConfig {
  mode: 'readonly'
  allowedDocumentPattern: string
  previewBaseUrl: string
}

export interface DocumentPayload {
  path: string
  content: string
  hash: string
  bytes: number
  modifiedAt: string
}

export interface PreviewStatusPayload {
  available: boolean
  status?: {
    status: string
    buildNumber?: number
    buildReason?: string
    releaseId?: string
    sourceCommit?: string
    sourceDirty?: boolean | null
    error?: string | null
  }
  error?: string
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.error || `请求失败（${response.status}）`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function getSession() {
  return request<{ authenticated: boolean }>('/api/session')
}

export function login(token: string) {
  return request<{ authenticated: true }>('/api/session', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export function logout() {
  return request<void>('/api/session', { method: 'DELETE' })
}

export function getEditorConfig() {
  return request<EditorConfig>('/api/config')
}

export function getDocument(path: string) {
  return request<DocumentPayload>(`/api/document?path=${encodeURIComponent(path)}`)
}

export function getPreviewStatus() {
  return request<PreviewStatusPayload>('/api/preview-status')
}
