<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import {
  closeImagePreview,
  useImagePreviewState
} from '../use-image-preview'

const { visible, src, alt } = useImagePreviewState()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeImagePreview()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="doc-image-preview-fade">
      <div
        v-if="visible"
        class="doc-image-preview"
        role="dialog"
        aria-modal="true"
        :aria-label="alt || '图片预览'"
        @click="closeImagePreview"
      >
        <button
          type="button"
          class="doc-image-preview__close"
          aria-label="关闭预览"
          @click.stop="closeImagePreview"
        >
          ×
        </button>
        <img
          :src="src"
          :alt="alt"
          class="doc-image-preview__img"
          @click.stop
        />
      </div>
    </Transition>
  </Teleport>
</template>
