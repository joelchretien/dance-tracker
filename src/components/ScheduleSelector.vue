<script setup lang="ts">
import type { ScheduleManifestEntry } from '@/types/schedule'

defineProps<{ schedules: ScheduleManifestEntry[] }>()

// BASE_URL resolves to '/' in dev and '/dance-tracker/' in production.
// Reusing the same illustration the search empty state uses keeps a
// single visual identity for "nothing to show right now."
const spotlightUrl = `${import.meta.env.BASE_URL}empty-spotlight.webp`
</script>

<template>
  <div class="w-full max-w-md">
    <h1 class="text-xl font-bold text-center mb-6">Dance Tracker</h1>

    <!-- Schedule list (1+ entries in manifest) -->
    <div v-if="schedules.length > 0" class="space-y-3">
      <router-link
        v-for="s in schedules"
        :key="s.id"
        :to="`/${s.id}`"
        class="block p-4 bg-surface-raised rounded-lg border border-gray-700 hover:border-indigo-500 transition-colors"
      >
        <div class="font-medium">{{ s.name }}</div>
      </router-link>
    </div>

    <!-- Empty state: no live competition. The illustration is the same
         spotlight asset used by the search empty state, keeping the
         visual identity consistent across "nothing to show" surfaces. -->
    <div v-else class="flex flex-col items-center pt-8 pb-6">
      <img
        :src="spotlightUrl"
        alt=""
        class="w-40 h-40 opacity-85"
        aria-hidden="true"
      />
      <div class="text-base text-gray-300 mt-4 text-center">
        No competition right now
      </div>
      <div class="text-sm text-gray-500 mt-2 text-center px-6">
        Check back later for the next event's schedule.
      </div>
    </div>
  </div>
</template>
