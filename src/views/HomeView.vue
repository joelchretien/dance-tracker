<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useScheduleStore } from '@/stores/schedule'
import ScheduleSelector from '@/components/ScheduleSelector.vue'

const router = useRouter()
const schedule = useScheduleStore()

onMounted(async () => {
  await schedule.loadManifest()
  // Auto-redirect if only one schedule
  if (schedule.manifest?.schedules.length === 1) {
    router.replace(`/${schedule.manifest.schedules[0].id}`)
  }
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen p-4">
    <div v-if="!schedule.manifest" class="text-gray-400">Loading...</div>
    <ScheduleSelector v-else :schedules="schedule.manifest.schedules" />
  </div>
</template>
