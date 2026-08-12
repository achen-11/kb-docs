import { computed, ref, shallowRef } from 'vue'
import {
  getBuildStatus,
  getEditorConfig,
  getPreviewStatus,
  getSession,
  getWorkspaceStatus,
  login,
  logout,
  type BuildStatusPayload,
  type EditorConfig,
  type PreviewStatusPayload,
  type WorkspaceStatusPayload,
} from '../api'

const authenticated = ref(false)
const sessionLoading = ref(true)
const editorConfig = shallowRef<EditorConfig | null>(null)
const previewStatus = shallowRef<PreviewStatusPayload | null>(null)
const buildStatus = shallowRef<BuildStatusPayload>({ status: 'idle', queued: 0 })
const workspaceStatus = shallowRef<WorkspaceStatusPayload | null>(null)
let previewTimer: number | undefined
let buildTimer: number | undefined
let workspaceTimer: number | undefined

const hasDraft = computed(() => workspaceStatus.value
  ? Boolean(workspaceStatus.value.changedFiles || workspaceStatus.value.pendingPush)
  : ['draft_saved', 'queued', 'saving', 'building', 'error', 'conflict'].includes(buildStatus.value.status))
const stableReleaseId = computed(() => previewStatus.value?.stable.status?.releaseId || buildStatus.value.releaseId || '')
const stableCommit = computed(() => previewStatus.value?.stable.status?.sourceCommit || '')

async function refreshPreviewStatus() {
  try {
    previewStatus.value = await getPreviewStatus()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    previewStatus.value = {
      fast: { available: false, error: message },
      stable: { available: false, error: message },
    }
  }
}

async function refreshBuildStatus() {
  try {
    const previous = buildStatus.value.status
    buildStatus.value = await getBuildStatus()
    if (['queued', 'building'].includes(previous) && buildStatus.value.status === 'ready') {
      await refreshPreviewStatus()
    }
  } catch {
    // Transient polling failures retry on the next interval.
  }
}

async function refreshWorkspaceStatus() {
  try {
    workspaceStatus.value = await getWorkspaceStatus()
  } catch {
    // The workflow page reports actionable errors; global status retries quietly.
  }
}

function startPolling() {
  window.clearInterval(previewTimer)
  window.clearInterval(buildTimer)
  previewTimer = window.setInterval(refreshPreviewStatus, 10_000)
  buildTimer = window.setInterval(refreshBuildStatus, 1_000)
  workspaceTimer = window.setInterval(refreshWorkspaceStatus, 5_000)
}

function stopPolling() {
  window.clearInterval(previewTimer)
  window.clearInterval(buildTimer)
  window.clearInterval(workspaceTimer)
}

async function initializeWorkspace() {
  editorConfig.value = await getEditorConfig()
  await Promise.all([refreshPreviewStatus(), refreshBuildStatus(), refreshWorkspaceStatus()])
  startPolling()
}

async function initializeSession() {
  sessionLoading.value = true
  try {
    const session = await getSession()
    authenticated.value = session.authenticated
    if (session.authenticated) await initializeWorkspace()
  } finally {
    sessionLoading.value = false
  }
}

async function signIn(token: string) {
  await login(token)
  authenticated.value = true
  await initializeWorkspace()
}

async function signOut() {
  await logout().catch(() => undefined)
  stopPolling()
  authenticated.value = false
  editorConfig.value = null
  previewStatus.value = null
  buildStatus.value = { status: 'idle', queued: 0 }
  workspaceStatus.value = null
}

export function useWorkspace() {
  return {
    authenticated,
    sessionLoading,
    editorConfig,
    previewStatus,
    buildStatus,
    workspaceStatus,
    hasDraft,
    stableReleaseId,
    stableCommit,
    initializeSession,
    refreshPreviewStatus,
    refreshBuildStatus,
    refreshWorkspaceStatus,
    signIn,
    signOut,
  }
}
