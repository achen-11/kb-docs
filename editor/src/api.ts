export interface EditorConfig {
  mode: 'draft'
  allowedDocumentPattern: string
  maximumDocumentBytes: number
  maximumMediaBytes: number
  fastPreviewBaseUrl: string
  stablePreviewBaseUrl: string
  productionPublishAvailable: boolean
}

export interface DocumentPayload {
  path: string
  content: string
  hash: string
  bytes: number
  modifiedAt: string
}

export interface PreviewStatusPayload {
  fast: {
    available: boolean
    error?: string
  }
  stable: {
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
}

export type BuildState = 'idle' | 'draft_saved' | 'queued' | 'saving' | 'building' | 'ready' | 'error' | 'conflict'

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
    status: 'not_requested'
    operationId: string
    scheduledAt: string
    debounceMs: number
  }
}

export interface RequestBuildPayload {
  status: 'queued'
  operationId: string
  scheduledAt: string
  debounceMs: number
}

export type WorkspaceFileStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked'

export interface WorkspaceFilePayload {
  path: string
  originalPath: string | null
  status: WorkspaceFileStatus
  staged: boolean
  additions: number | null
  deletions: number | null
  binary: boolean
}

export interface WorkspaceStatusPayload {
  ahead: number | null
  behind: number | null
  branch: string
  changedFiles: number
  files: WorkspaceFilePayload[]
  fingerprint: string
  head: string
  outOfScopeFiles: number
  pendingPush: boolean
  pendingPushCommit: string | null
  remote: string
  remoteBranch: string
  stagedFiles: number
}

export interface WorkspaceDiffPayload {
  path: string
  binary: boolean
  diff: string
  truncated: boolean
}

export interface WorkspaceCommitPayload {
  hash: string
  shortHash: string
  author: string
  authoredAt: string
  subject: string
}

export interface WorkspaceSubmitPayload {
  branch: string
  commit: string
  pushed: boolean
  remote: string
  workspace: WorkspaceStatusPayload
}

export interface MediaItemPayload {
  path: string
  url: string
  name: string
  bytes: number
  modifiedAt: string
}

export interface MediaListPayload {
  items: MediaItemPayload[]
  total: number
  page: number
  pageSize: number
  folders: string[]
  roots: string[]
}

export interface MediaReferencesPayload {
  path: string
  url: string
  references: Array<{ path: string; line: number }>
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

export function requestStableBuild(path: string) {
  return request<RequestBuildPayload>('/api/build', {
    method: 'POST',
    body: JSON.stringify({ path }),
  })
}

export function getBuildStatus() {
  return request<BuildStatusPayload>('/api/build-status')
}

export function getPreviewStatus() {
  return request<PreviewStatusPayload>('/api/preview-status')
}

export function getWorkspaceStatus() {
  return request<WorkspaceStatusPayload>('/api/workspace')
}

export function getWorkspaceDiff(path: string) {
  return request<WorkspaceDiffPayload>(`/api/workspace/diff?path=${encodeURIComponent(path)}`)
}

export function getWorkspaceCommits(limit = 8) {
  return request<{ commits: WorkspaceCommitPayload[] }>(`/api/workspace/commits?limit=${limit}`)
}

export function revertWorkspaceFiles(paths: string[], expectedFingerprint: string) {
  return request<WorkspaceStatusPayload>('/api/workspace/revert', {
    method: 'POST',
    body: JSON.stringify({ paths, expectedFingerprint }),
  })
}

export function submitWorkspace(message: string, expectedFingerprint: string) {
  return request<WorkspaceSubmitPayload>('/api/workspace/commit', {
    method: 'POST',
    body: JSON.stringify({ message, expectedFingerprint }),
  })
}

export function retryWorkspacePush() {
  return request<WorkspaceSubmitPayload>('/api/workspace/push', { method: 'POST' })
}

export function getMediaList(options: { root?: string; search?: string; page?: number; pageSize?: number } = {}) {
  const parameters = new URLSearchParams()
  if (options.root) parameters.set('root', options.root)
  if (options.search) parameters.set('search', options.search)
  parameters.set('page', String(options.page || 1))
  parameters.set('pageSize', String(options.pageSize || 48))
  return request<MediaListPayload>(`/api/media?${parameters}`)
}

export function mediaContentUrl(path: string) {
  return `/api/media/content?path=${encodeURIComponent(path)}`
}

export function getMediaReferences(path: string) {
  return request<MediaReferencesPayload>(`/api/media/references?path=${encodeURIComponent(path)}`)
}

export function uploadMedia(directory: string, fileName: string, contentBase64: string) {
  return request<MediaItemPayload>('/api/media/upload', {
    method: 'POST',
    body: JSON.stringify({ directory, fileName, contentBase64 }),
  })
}
