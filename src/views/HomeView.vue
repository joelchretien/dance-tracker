<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useScheduleStore } from '@/stores/schedule'
import ScheduleSelector from '@/components/ScheduleSelector.vue'

const router = useRouter()
const schedule = useScheduleStore()

async function load() {
  await schedule.loadManifest()
  if (schedule.manifest?.schedules.length === 1) {
    router.replace(`/${schedule.manifest.schedules[0].id}`)
  }
}

onMounted(load)
</script>

<template>
  <div class="flex items-center justify-center min-h-screen p-4">
    <div v-if="schedule.error" class="text-center">
      <div class="text-gray-400 mb-4">{{ schedule.error }}</div>
      <button
        class="px-5 py-2.5 bg-indigo-600 rounded-lg text-sm font-medium active:bg-indigo-700"
        @click="load"
      >Retry</button>
    </div>
    <div v-else-if="!schedule.manifest" class="text-gray-400">Loading...</div>
    <ScheduleSelector v-else :schedules="schedule.manifest.schedules" />
  </div>
</template>
