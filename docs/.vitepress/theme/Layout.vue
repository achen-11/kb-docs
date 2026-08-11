<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import ImageLightbox from './components/ImageLightbox.vue'
import { useDocImagePreview } from './use-doc-image-preview'
import { useEditorRouteSync } from './use-editor-route-sync'
import { useLocalizedDocImages } from './use-localized-doc-images'

useDocImagePreview()
useEditorRouteSync()
useLocalizedDocImages()
</script>

<template>
  <DefaultTheme.Layout>
    <template #layout-bottom>
      <ImageLightbox />
    </template>
  </DefaultTheme.Layout>
</template>
