<script setup lang="ts">
import DocImage from './DocImage.vue'

defineProps<{
  src: string
  alt: string
  marks?: { x: number; y: number; w: number; h: number; label?: string }[]
}>()
</script>

<template>
  <figure class="manual-image">
    <DocImage :src="src" :alt="alt" width="1120" />
    <span
      v-for="(mark, index) in marks"
      :key="index"
      class="manual-image-mark"
      aria-hidden="true"
      :style="{
        left: mark.x + '%',
        top: mark.y + '%',
        width: mark.w + '%',
        height: mark.h + '%',
      }"
    ><span v-if="mark.label" class="manual-image-number">{{ mark.label }}</span></span>
  </figure>
</template>

<style scoped>
.manual-image {
  position: relative;
  margin: 20px 0 32px;
  max-width: 1120px;
}
.manual-image :deep(img) {
  display: block;
  width: 100%;
  height: auto;
  margin: 0;
}
.manual-image-mark {
  position: absolute;
  border: 3px solid #ed4242;
  border-radius: 4px;
  pointer-events: none;
  box-sizing: border-box;
}
.manual-image-number {
  position: absolute;
  top: -12px;
  left: -12px;
  display: grid;
  place-items: center;
  min-width: 24px;
  height: 24px;
  padding: 0 5px;
  border-radius: 50%;
  color: #fff;
  background: #c92b2b;
  font: 700 13px/1 Arial, sans-serif;
}
@media (max-width: 640px) {
  .manual-image-mark { border-width: 2px; }
  .manual-image-number { min-width: 20px; height: 20px; font-size: 11px; top: -10px; left: -10px; }
}
</style>
