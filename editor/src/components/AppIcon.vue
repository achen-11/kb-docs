<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <svg class="app-icon" viewBox="0 0 24 24" aria-hidden="true">
    <template v-if="name === 'dashboard'"><path d="M4 13h6V4H4zM14 20h6V11h-6zM4 20h6v-3H4zM14 7h6V4h-6z" /></template>
    <template v-else-if="name === 'document'"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6" /></template>
    <template v-else-if="name === 'media'"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m6 17 4-4 3 3 2-2 3 3M8.5 9.5h.01" /></template>
    <template v-else-if="name === 'diff'"><path d="M8 3v14M5 6l3-3 3 3M16 21V7M13 18l3 3 3-3" /></template>
    <template v-else-if="name === 'workflow'"><path d="M5 5h5M14 5h5M8 5v6h8v6M13 14l3 3 3-3M5 17h5" /><circle cx="5" cy="5" r="2" /><circle cx="5" cy="17" r="2" /></template>
    <template v-else-if="name === 'history'"><path d="M4 12a8 8 0 1 0 3-6M4 4v5h5M12 7v5l3 2" /></template>
    <template v-else-if="name === 'review'"><path d="M5 3h14v18H5zM8 8h8M8 12h5M8 16l2 2 4-4" /></template>
    <template v-else-if="name === 'build'"><path d="M4 5h16v11H4zM9 20h6M12 16v4" /><path d="m10 9 2-2 2 2-2 2z" /></template>
    <template v-else-if="name === 'candidate'"><path d="M4 19h16M6 16V8l6-4 6 4v8M9 16v-5h6v5" /></template>
    <template v-else-if="name === 'production'"><path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" /></template>
    <template v-else-if="name === 'release'"><path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" /></template>
    <template v-else-if="name === 'users'"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2M16 11a3 3 0 1 0 0-6M16 14a5 5 0 0 1 6 5v2" /></template>
    <template v-else-if="name === 'settings'"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1L14.6 3h-4l-.3 3.1a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L6.1 11a7 7 0 0 0 0 2L4.3 14.5l2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 3.1h4l.3-3.1a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" /></template>
    <template v-else-if="name === 'audit'"><path d="M5 3h14v18H5zM9 7h6M9 11h6M9 15h3" /><circle cx="16" cy="16" r="3" /><path d="m18 18 2 2" /></template>
    <template v-else><circle cx="12" cy="12" r="8" /></template>
  </svg>
</template>
