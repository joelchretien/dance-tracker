<script setup lang="ts">
import type { ScheduleManifestEntry } from '@/types/schedule'

defineProps<{ schedules: ScheduleManifestEntry[] }>()

// BASE_URL resolves to '/' in dev and '/dance-tracker/' in production.
// Reusing the same illustration the search empty state uses keeps a
// single visual identity for "nothing to show right now."
const spotlightUrl = `${import.meta.env.BASE_URL}empty-spotlight.webp`
</script>

<template>
  <!-- Two distinct shapes: a list of schedules vs an empty state. They
       want different layouts (constrained max-width column vs. centered
       hero), so they're separate top-level templates rather than one
       wrapper that tries to accommodate both. -->

  <!-- Schedule list (1+ entries in manifest) -->
  <div v-if="schedules.length > 0" class="w-full max-w-md">
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

  <!-- Empty state: between competitions. Centered hero with the
       spotlight illustration as the focal point. The "Dance Tracker"
       title is dropped here — the user knows what app they opened, and
       repeating it would split the visual hierarchy between two equal-
       weight elements. The illustration carries the page identity, the
       copy explains the state. -->
  <div v-else class="flex flex-col items-center text-center px-6">
    <img
      :src="spotlightUrl"
      alt=""
      class="w-56 h-56 mb-6"
      aria-hidden="true"
    />
    <div class="text-lg font-medium text-gray-200">
      No competition right now
    </div>
    <div class="text-sm text-gray-500 mt-2 max-w-xs">
      Check back later for the next event's schedule.
    </div>
  </div>
</template>
