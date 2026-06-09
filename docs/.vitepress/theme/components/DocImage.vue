<script setup lang="ts">
/**
 * 文档配图：带边框样式，点击全屏预览。
 * 在 Markdown 中可直接写 HTML 使用本组件。
 */
import { useRoute } from 'vitepress'
import { computed } from 'vue'
import { openImagePreview } from '../use-image-preview'
import { resolveLocalizedDocImageSrc } from '../doc-image-path.mjs'

const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
    width?: string | number
  }>(),
  { alt: '' }
)

const route = useRoute()

const resolvedSrc = computed(() => resolveLocalizedDocImageSrc(props.src, route.path))

function onPreview(event: MouseEvent) {
  event.stopPropagation()
  openImagePreview({ src: resolvedSrc.value, alt: props.alt })
}
</script>

<template>
  <img
    :src="resolvedSrc"
    :alt="alt"
    :width="width"
    class="bordered-image doc-image"
    loading="lazy"
    role="button"
    tabindex="0"
    @click="onPreview"
    @keydown.enter.prevent="onPreview"
    @keydown.space.prevent="onPreview"
  />
</template>
