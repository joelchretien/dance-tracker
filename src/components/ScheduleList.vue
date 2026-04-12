<script setup lang="ts">
import { useScheduleStore } from '@/stores/schedule'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'
import DayHeader from './DayHeader.vue'
import CategoryHeader from './CategoryHeader.vue'
import DanceEntry from './DanceEntry.vue'
import BreakEntry from './BreakEntry.vue'

const schedule = useScheduleStore()
const navigation = useNavigationStore()
const watchStore = useWatchStore()

function shouldShowCategoryHeader(index: number): boolean {
  const item = schedule.flatEntries[index]
  if (!item || item.entry.type !== 'dance' || !item.entry.category) return false

  if (index === 0) return true
  if (index > 0 && item.dayIndex !== schedule.flatEntries[index - 1].dayIndex) return true

  for (let i = index - 1; i >= 0; i--) {
    const prev = schedule.flatEntries[i]
    if (prev.entry.type !== 'dance') return true
    if (prev.entry.type === 'dance' && prev.entry.category !== item.entry.category) return true
    return false
  }
  return true
}

function isNewDay(index: number): boolean {
  if (index === 0) return true
  return schedule.flatEntries[index].dayIndex !== schedule.flatEntries[index - 1].dayIndex
}

function handleSelect(globalIndex: number) {
  navigation.select(globalIndex)
}

function handleMarkCurrent(globalIndex: number) {
  navigation.markAsCurrent(globalIndex)
}
</script>

<template>
  <div class="pb-4">
    <template v-for="(item, i) in schedule.flatEntries" :key="item.globalIndex">
      <DayHeader
        v-if="isNewDay(i)"
        :label="schedule.days[item.dayIndex].label"
      />

      <CategoryHeader
        v-if="shouldShowCategoryHeader(i)"
        :category="(item.entry as any).category"
      />

      <DanceEntry
        v-if="item.entry.type === 'dance'"
        :id="`entry-${item.globalIndex}`"
        :entry="item.entry"
        :global-index="item.globalIndex"
        :is-marked="item.globalIndex === navigation.markedIndex"
        :is-selected="item.globalIndex === navigation.selectedIndex"
        :is-watched="watchStore.isWatchedEntry(item.globalIndex)"
        :watched-dancers="watchStore.getWatchedDancersForEntry(item.globalIndex)"
        :same-studio="!!(item.entry.studio && watchStore.watchedStudios.has(item.entry.studio))"
        @select="handleSelect(item.globalIndex)"
        @mark-current="handleMarkCurrent(item.globalIndex)"
      />

      <BreakEntry
        v-else
        :id="`entry-${item.globalIndex}`"
        :entry="item.entry"
        :global-index="item.globalIndex"
        :is-marked="item.globalIndex === navigation.markedIndex"
        :is-selected="item.globalIndex === navigation.selectedIndex"
        :is-watched-awards="item.entry.type === 'awards' && watchStore.watchedAwardsSet.has(item.globalIndex)"
        @select="handleSelect(item.globalIndex)"
        @mark-current="handleMarkCurrent(item.globalIndex)"
      />
    </template>
  </div>
</template>
