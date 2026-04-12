<script setup lang="ts">
import CountdownBanner from './CountdownBanner.vue'
import NavButtons from './NavButtons.vue'

const emit = defineEmits<{ 'jump-to-next': [] }>()
</script>

<template>
  <div id="bottom-bar" class="fixed bottom-0 left-0 right-0 z-20 bg-surface border-t border-gray-800">
    <div class="px-2 pt-2 pb-1.5">
      <div @click="emit('jump-to-next')">
        <CountdownBanner />
      </div>
      <NavButtons />
    </div>
    <!-- Safe area spacer — sits below buttons, fills home indicator zone -->
    <div style="height: env(safe-area-inset-bottom, 0px)" class="bg-surface"></div>
  </div>
</template>
