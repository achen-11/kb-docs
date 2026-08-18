<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useRoute } from 'vitepress'
import { watch } from 'vue'
import ImageLightbox from './components/ImageLightbox.vue'
import { useDocImagePreview } from './use-doc-image-preview'
import { useEditorRouteSync } from './use-editor-route-sync'
import { useLocalizedDocImages } from './use-localized-doc-images'
import { canonicalPathFromLegacyEnglish } from '../../../scripts/docs-publish-locale.mjs'

const route = useRoute()

watch(
  () => route.path,
  (pathname) => {
    if (typeof window === 'undefined') return
    if (pathname.includes('.md')) return
    const next = canonicalPathFromLegacyEnglish(`${pathname}${window.location.search}`)
    if (!next || next === pathname) return
    window.location.replace(`${next}${window.location.hash}`)
  },
  { immediate: true }
)

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
