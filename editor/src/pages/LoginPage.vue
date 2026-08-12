<script setup lang="ts">
import { ref } from 'vue'
import { useWorkspace } from '../app/workspace'

const workspace = useWorkspace()
const token = ref('')
const authenticating = ref(false)
const errorMessage = ref('')

async function submitLogin() {
  if (!token.value || authenticating.value) return
  authenticating.value = true
  errorMessage.value = ''
  try {
    await workspace.signIn(token.value)
    token.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    authenticating.value = false
  }
}
</script>

<template>
  <main class="login-shell">
    <section class="login-card" aria-labelledby="login-title">
      <div class="brand-mark">K</div>
      <p class="eyebrow">KOOBOO DOCS STUDIO</p>
      <h1 id="login-title">文档运营后台</h1>
      <p class="login-copy">登录后可以编辑 Markdown 草稿、核对预览，并进入图片、版本和发布工作流。</p>
      <form @submit.prevent="submitLogin">
        <label for="editor-token">访问口令</label>
        <input id="editor-token" v-model="token" type="password" autocomplete="current-password" placeholder="输入内部访问口令" autofocus />
        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
        <button class="primary-button" type="submit" :disabled="authenticating || !token">{{ authenticating ? '正在验证…' : '进入 Docs Studio' }}</button>
      </form>
    </section>
  </main>
</template>
