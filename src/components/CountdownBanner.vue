<script setup lang="ts">
import { computed } from 'vue'
import { useWatchStore } from '@/stores/watch'

const watchStore = useWatchStore()

const styleType = computed(() => watchStore.nextTargetStyleType)
const targetEntry = computed(() => watchStore.nextTargetEntry)
const dancers = computed(() => watchStore.nextTargetWatchedDancers)
const dancesUntil = computed(() => watchStore.dancesUntilTarget)
const subtitle = computed(() => watchStore.nextTargetSubtitle)
const time = computed(() => watchStore.nextTargetTime)
const timeDiff = computed(() => watchStore.nextTargetTimeDiff)
const isWatchedAwards = computed(() => watchStore.nextTargetIsWatchedAwards)

const show = computed(() => watchStore.watchedDancers.length > 0 && targetEntry.value !== null)

const countdownLabel = computed(() => {
  if (dancesUntil.value === null) return ''
  return dancesUntil.value === 1 ? 'dance until' : 'dances until'
})
</script>

<template>
  <div v-if="show">
    <!-- ON NOW: dance with watched dancer -->
    <div
      v-if="styleType === 'on-now' && !isWatchedAwards"
      class="px-3 py-2 bg-gradient-to-r from-gold-500 to-gold-400 rounded-lg mx-2 mb-1 text-center"
    >
      <div class="text-[15px] font-extrabold text-surface">
        ON NOW — {{ dancers.join(' & ') }}
      </div>
      <div class="text-[13px] font-semibold text-black/45 mt-0.5">
        {{ targetEntry?.title }}<span v-if="subtitle"> · {{ subtitle }}</span>
      </div>
    </div>

    <!-- ON NOW: awards block with watched dancers -->
    <div
      v-else-if="styleType === 'on-now' && isWatchedAwards"
      class="px-3 py-2 bg-gradient-to-r from-gold-500 to-gold-400 rounded-lg mx-2 mb-1 text-center"
    >
      <div class="text-[15px] font-extrabold text-surface">{{ targetEntry?.title }}</div>
      <div class="text-[13px] font-semibold text-black/45 mt-0.5">Watched Dancers in this block</div>
    </div>

    <!-- Countdown / Up Next -->
    <div
      v-else
      class="w-full px-3 py-2.5 rounded-lg mx-2 mb-1 border border-gold-400/20 bg-gold-400/10 text-left"
      style="max-width: calc(100% - 1rem)"
    >
      <!-- Line 1: count + title -->
      <div class="flex items-baseline gap-1.5 flex-wrap">
        <template v-if="styleType === 'up-next'">
          <span class="text-sm text-gold-400 font-semibold">Up next →</span>
          <span class="text-sm text-gold-400 font-extrabold">{{ targetEntry?.title }}</span>
        </template>
        <template v-else>
          <span class="text-[22px] font-extrabold text-gold-400 leading-none">{{ dancesUntil }}</span>
          <span class="text-sm text-gold-400 font-semibold">{{ countdownLabel }}</span>
          <span class="text-sm text-gold-400 font-extrabold">{{ targetEntry?.title }}</span>
        </template>
      </div>

      <!-- Line 2: category/time info -->
      <div class="text-xs text-gold-400/50 mt-0.5">
        <template v-if="isWatchedAwards">
          Watched Dancers in this block<span v-if="time"> · {{ time }}</span><span v-if="timeDiff"> · {{ timeDiff }}</span>
        </template>
        <template v-else>
          <span v-if="subtitle">{{ subtitle }} · </span>{{ time }}<span v-if="timeDiff"> · {{ timeDiff }}</span>
        </template>
      </div>

      <!-- Line 3: dancer names + tap hint -->
      <div class="text-[11px] text-gold-400/35 mt-0.5">
        <template v-if="isWatchedAwards">tap to jump</template>
        <template v-else>
          {{ dancers.join(' & ') }}<span v-if="dancers.length"> · </span>tap to jump
        </template>
      </div>
    </div>
  </div>
</template>
