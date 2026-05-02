<script setup lang="ts">
import { computed } from 'vue'
import { useWatchStore } from '@/stores/watch'
import { titleCaseDanceTitle } from '@/lib/title-case'

const watchStore = useWatchStore()

const styleType = computed(() => watchStore.nextTargetStyleType)
const targetEntry = computed(() => watchStore.nextTargetEntry)
const targetTitle = computed(() => titleCaseDanceTitle(targetEntry.value?.title ?? ''))
const dancers = computed(() => watchStore.nextTargetWatchedDancers)
const dancesUntil = computed(() => watchStore.dancesUntilTarget)
const subtitle = computed(() => watchStore.nextTargetSubtitle)
const time = computed(() => watchStore.nextTargetTime)
const timeDiff = computed(() => watchStore.nextTargetTimeDiff)
const isWatchedAwards = computed(() => watchStore.nextTargetIsWatchedAwards)
const isCrossDay = computed(() => watchStore.nextTargetIsCrossDay)
const targetDayLabel = computed(() => watchStore.nextTargetDayLabel)

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
      class="px-3 py-2 bg-gradient-to-r from-gold-500 to-gold-400 rounded-lg"
    >
      <div class="text-[15px] font-extrabold text-surface">
        ON NOW — {{ dancers.join(' & ') }}
      </div>
      <div class="text-[13px] font-semibold text-black/45 mt-0.5">
        {{ targetTitle }}<span v-if="subtitle"> · {{ subtitle }}</span>
      </div>
    </div>

    <!-- ON NOW: awards block with watched dancers -->
    <div
      v-else-if="styleType === 'on-now' && isWatchedAwards"
      class="px-3 py-2 bg-gradient-to-r from-gold-500 to-gold-400 rounded-lg"
    >
      <div class="text-[15px] font-extrabold text-surface">{{ targetTitle }}</div>
      <div class="text-[13px] font-semibold text-black/45 mt-0.5">Watched Dancers in this block</div>
    </div>

    <!-- Cross-day: don't show a misleading dance count or time-diff. -->
    <div
      v-else-if="isCrossDay"
      class="px-3 py-2.5 rounded-lg border border-gold-400/20 bg-gold-400/10"
    >
      <div class="flex items-baseline gap-1.5 flex-wrap">
        <span class="text-sm text-gold-400 font-semibold">Next watched →</span>
        <span class="text-sm text-gold-400 font-extrabold">{{ targetTitle }}</span>
      </div>
      <div class="text-xs text-gold-400/50 mt-0.5">
        {{ targetDayLabel }}<span v-if="time"> · {{ time }}</span><span v-if="subtitle && !isWatchedAwards"> · {{ subtitle }}</span>
      </div>
    </div>

    <!-- Same-day countdown / Up Next -->
    <div
      v-else
      class="px-3 py-2.5 rounded-lg border border-gold-400/20 bg-gold-400/10"
    >
      <!-- Line 1: count + title -->
      <div class="flex items-baseline gap-1.5 flex-wrap">
        <template v-if="styleType === 'up-next'">
          <span class="text-sm text-gold-400 font-semibold">Up next →</span>
          <span class="text-sm text-gold-400 font-extrabold">{{ targetTitle }}</span>
        </template>
        <template v-else>
          <span class="text-[22px] font-extrabold text-gold-400 leading-none">{{ dancesUntil }}</span>
          <span class="text-sm text-gold-400 font-semibold">{{ countdownLabel }}</span>
          <span class="text-sm text-gold-400 font-extrabold">{{ targetTitle }}</span>
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
    </div>
  </div>
</template>
