<script setup lang="ts">
import { useScheduleStore } from '@/stores/schedule'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'
import type { DanceEntry as DanceEntryType } from '@/types/schedule'
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
  const prev = schedule.flatEntries[index - 1]
  if (prev.dayIndex !== item.dayIndex) return true
  if (prev.entry.type !== 'dance') return true
  return prev.entry.category !== item.entry.category
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

function handleSeek(progress: number) {
  navigation.seekProgress(progress)
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
        :category="(item.entry as DanceEntryType).category ?? ''"
      />

      <DanceEntry
        v-if="item.entry.type === 'dance'"
        :entry="item.entry"
        :global-index="item.globalIndex"
        :is-marked="item.globalIndex === navigation.activeIndex && navigation.currentIsVisible"
        :is-likely="navigation.activeIsLikely"
        :is-selected="item.globalIndex === navigation.selectedIndex"
        :is-watched="watchStore.isWatchedEntry(item.globalIndex)"
        :watched-dancers="watchStore.getWatchedDancersForEntry(item.globalIndex)"
        :same-studio="!!(item.entry.studio && watchStore.watchedStudios.has(item.entry.studio))"
        :progress="item.globalIndex === navigation.activeIndex ? navigation.activeProgress : 0"
        :offset-minutes="navigation.scheduleOffsetMinutes"
        :can-set-current="navigation.isWithinActiveHours"
        @select="handleSelect(item.globalIndex)"
        @mark-current="handleMarkCurrent(item.globalIndex)"
        @seek="handleSeek"
      />

      <BreakEntry
        v-else
        :entry="item.entry"
        :global-index="item.globalIndex"
        :is-marked="item.globalIndex === navigation.activeIndex && navigation.currentIsVisible"
        :is-likely="navigation.activeIsLikely"
        :is-selected="item.globalIndex === navigation.selectedIndex"
        :is-watched-awards="item.entry.type === 'awards' && watchStore.watchedAwardsSet.has(item.globalIndex)"
        :watched-dancers="item.entry.type === 'awards' ? watchStore.getWatchedDancersForAwards(item.globalIndex) : []"
        :progress="item.globalIndex === navigation.activeIndex ? navigation.activeProgress : 0"
        :offset-minutes="navigation.scheduleOffsetMinutes"
        :can-set-current="navigation.isWithinActiveHours"
        @select="handleSelect(item.globalIndex)"
        @mark-current="handleMarkCurrent(item.globalIndex)"
        @seek="handleSeek"
      />
    </template>
  </div>
</template>
