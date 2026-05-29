<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import ImageLightbox from './components/ImageLightbox.vue'
import { useDocImagePreview } from './use-doc-image-preview'

useDocImagePreview()
</script>

<template>
  <DefaultTheme.Layout>
    <template #layout-bottom>
      <ImageLightbox />
    </template>
  </DefaultTheme.Layout>
</template>
