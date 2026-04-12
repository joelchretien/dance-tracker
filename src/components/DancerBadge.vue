<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <span class="fs-name inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gold-400/20 text-gold-400">
    <span class="text-[0.6rem]">★</span>
    {{ name }}
  </span>
</template>
