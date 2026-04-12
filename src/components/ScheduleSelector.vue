<script setup lang="ts">
import type { ScheduleManifestEntry } from '@/types/schedule'

defineProps<{ schedules: ScheduleManifestEntry[] }>()
</script>

<template>
  <div class="w-full max-w-md">
    <h1 class="text-xl font-bold text-center mb-6">Dance Tracker</h1>
    <div class="space-y-3">
      <router-link
        v-for="s in schedules"
        :key="s.id"
        :to="`/${s.id}`"
        class="block p-4 bg-surface-raised rounded-lg border border-gray-700 hover:border-indigo-500 transition-colors"
      >
        <div class="font-medium">{{ s.name }}</div>
      </router-link>
    </div>
  </div>
</template>
