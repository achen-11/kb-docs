<script setup lang="ts">
import MediaBrowser from '../components/MediaBrowser.vue'
</script>

<template>
  <div class="media-page page-content">
    <section class="media-intro"><div><p class="section-kicker">Git 管理的图片资源</p><h2>浏览、上传并复用文档图片</h2><p>支持拖拽和剪贴板粘贴。上传只保存为服务器 Git 草稿，不会直接发布到线上。</p></div><RouterLink class="primary-link compact" to="/content/editor">返回文档编辑</RouterLink></section>
    <MediaBrowser />
  </div>
</template>
