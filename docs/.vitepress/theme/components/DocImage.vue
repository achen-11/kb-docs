<script setup lang="ts">
/**
 * 文档配图：带边框样式，点击全屏预览。
 * 在 Markdown 中可直接写 HTML 使用本组件。
 */
import { openImagePreview } from '../use-image-preview'

const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
    width?: string | number
  }>(),
  { alt: '' }
)

function onPreview(event: MouseEvent) {
  event.stopPropagation()
  openImagePreview({ src: props.src, alt: props.alt })
}
</script>

<template>
  <img
    :src="src"
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
