<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { RouterView } from 'vue-router'

const hasError = ref(false)

onErrorCaptured((err) => {
  console.error('Unhandled error:', err)
  hasError.value = true
  return false
})

function reload() {
  window.location.reload()
}
</script>

<template>
  <div class="min-h-screen bg-surface text-gray-100">
    <div v-if="hasError" class="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div class="text-lg font-semibold mb-2">Something went wrong</div>
      <div class="text-sm text-gray-400 mb-6">The app ran into an unexpected error.</div>
      <button
        class="px-6 py-3 bg-indigo-600 rounded-lg text-sm font-medium active:bg-indigo-700"
        @click="reload"
      >Tap to reload</button>
    </div>
    <RouterView v-else />
  </div>
</template>
