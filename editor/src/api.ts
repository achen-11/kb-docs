export interface EditorConfig {
  mode: 'draft'
  allowedDocumentPattern: string
  maximumDocumentBytes: number
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

export type BuildState = 'idle' | 'queued' | 'saving' | 'building' | 'ready' | 'error' | 'conflict'

export interface BuildStatusPayload {
  status: BuildState
  queued: number
  operationId?: string | null
  path?: string | null
  savedAt?: string | null
  finishedAt?: string | null
  releaseId?: string | null
  error?: string | null
}

export interface SaveDocumentPayload {
  document: DocumentPayload
  build: {
    status: 'ready' | 'error'
    releaseId?: string | null
    error?: string
    finishedAt: string
  }
}

export class ApiError extends Error {
  status: number
  code?: string
  payload?: Record<string, unknown>

  constructor(message: string, status: number, payload?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = typeof payload?.code === 'string' ? payload.code : undefined
    this.payload = payload
  }
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
    const payload = await response.json().catch(() => undefined) as Record<string, unknown> | undefined
    throw new ApiError(
      typeof payload?.error === 'string' ? payload.error : `请求失败（${response.status}）`,
      response.status,
      payload
    )
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

export function saveDocument(path: string, content: string, expectedHash: string) {
  return request<SaveDocumentPayload>('/api/document', {
    method: 'PUT',
    body: JSON.stringify({ path, content, expectedHash }),
  })
}

export function getBuildStatus() {
  return request<BuildStatusPayload>('/api/build-status')
}

export function getPreviewStatus() {
  return request<PreviewStatusPayload>('/api/preview-status')
}
