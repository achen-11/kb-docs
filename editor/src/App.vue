<script setup lang="ts">
import { onMounted } from 'vue'
import AppShell from './app/AppShell.vue'
import LoginPage from './pages/LoginPage.vue'
import { useWorkspace } from './app/workspace'

const workspace = useWorkspace()

onMounted(() => {
  void workspace.initializeSession()
})
</script>

<template>
  <div v-if="workspace.sessionLoading.value" class="app-loading" aria-live="polite">
    <div class="brand-mark">K</div>
    <strong>正在连接 Kooboo Docs Studio</strong>
  </div>
  <LoginPage v-else-if="!workspace.authenticated.value" />
  <AppShell v-else />
</template>
