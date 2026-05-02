<script setup lang="ts">
import { computed } from 'vue'
import { useScheduleStore } from '@/stores/schedule'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'
import { parseTime, formatTimeDiff } from '@/lib/time'
import { countDancesUntil } from '@/lib/countdown'
import type { DanceEntry as DanceEntryType, BreakEntry as BreakEntryType, AwardsEntry } from '@/types/schedule'
import DanceEntry from './DanceEntry.vue'
import BreakEntry from './BreakEntry.vue'
import DayHeader from './DayHeader.vue'

const schedule = useScheduleStore()
const navigation = useNavigationStore()
const watchStore = useWatchStore()

interface ListItem {
  kind: 'entry' | 'gap' | 'current-marker' | 'day-header'
  // entry
  globalIndex?: number
  // gap
  timeDiff?: string
  danceCount?: number
  // current-marker
  markedTitle?: string
  markedTime?: string
  markedNum?: number
  // day-header
  dayLabel?: string
}

const listItems = computed<ListItem[]>(() => {
  const indices = watchStore.watchedEntryIndices
  if (indices.length === 0) return []

  const items: ListItem[] = []
  const markedIdx = navigation.activeIndex

  for (let i = 0; i < indices.length; i++) {
    const gi = indices[i]
    const item = schedule.flatEntries[gi]
    if (!item) continue

    // Day header if day changed from previous filtered entry
    if (i === 0 || item.dayIndex !== schedule.flatEntries[indices[i - 1]].dayIndex) {
      items.push({ kind: 'day-header', dayLabel: schedule.days[item.dayIndex].label })
    }

    // Gap indicator between consecutive filtered entries
    if (i > 0) {
      const prevGi = indices[i - 1]
      const prevEntry = schedule.flatEntries[prevGi]?.entry
      const curEntry = item.entry

      const fromMin = parseTime(prevEntry?.time ?? '')
      const toMin = parseTime(curEntry.time)
      const timeDiff = formatTimeDiff(fromMin, toMin)
      const danceCount = countDancesUntil(schedule.flatEntries, prevGi, gi)

      // Check if the marked dance falls between previous and current
      const markedBetween = markedIdx > prevGi && markedIdx < gi
        && !watchStore.watchedEntryIndices.includes(markedIdx)

      if (markedBetween) {
        const markedItem = schedule.flatEntries[markedIdx]
        const me = markedItem?.entry
        items.push({
          kind: 'current-marker',
          markedTitle: me?.title ?? '',
          markedTime: me?.time ?? '',
          markedNum: me?.type === 'dance' ? me.num : undefined,
        })
      }

      if (timeDiff || danceCount > 0) {
        items.push({ kind: 'gap', timeDiff, danceCount })
      }
    } else {
      // Before the first entry, check if marked is before it
      const markedBefore = markedIdx < gi
        && !watchStore.watchedEntryIndices.includes(markedIdx)
      if (markedBefore) {
        const markedItem = schedule.flatEntries[markedIdx]
        const me = markedItem?.entry
        items.push({
          kind: 'current-marker',
          markedTitle: me?.title ?? '',
          markedTime: me?.time ?? '',
          markedNum: me?.type === 'dance' ? me.num : undefined,
        })
      }
    }

    items.push({ kind: 'entry', globalIndex: gi })
  }

  // Check if marked is after the last filtered entry
  if (indices.length > 0) {
    const lastGi = indices[indices.length - 1]
    const markedAfter = markedIdx > lastGi
      && !watchStore.watchedEntryIndices.includes(markedIdx)
    if (markedAfter) {
      const markedItem = schedule.flatEntries[markedIdx]
      const me = markedItem?.entry
      items.push({
        kind: 'current-marker',
        markedTitle: me?.title ?? '',
        markedTime: me?.time ?? '',
        markedNum: me?.type === 'dance' ? me.num : undefined,
      })
    }
  }

  return items
})

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
    <div v-if="watchStore.watchedDancers.length === 0" class="text-center text-gray-500 py-12 px-4">
      <div class="text-sm">No dancers watched yet</div>
      <div class="text-xs mt-1">Open Settings to add dancers</div>
    </div>

    <div v-else-if="watchStore.watchedEntryIndices.length === 0" class="text-center text-gray-500 py-12 px-4">
      <div class="text-sm">No dances found for watched dancers</div>
    </div>

    <template v-else v-for="(li, i) in listItems" :key="`${li.kind}-${li.globalIndex ?? i}`">
      <!-- Day header -->
      <DayHeader v-if="li.kind === 'day-header'" :label="li.dayLabel!" />

      <!-- Current position marker -->
      <div v-else-if="li.kind === 'current-marker'" id="current-position-marker" class="mx-4 my-2 flex items-center gap-2">
        <div class="flex-1 border-t border-dashed border-indigo-400/40"></div>
        <span class="text-[10px] text-indigo-400/70 font-semibold uppercase tracking-wide shrink-0">
          ▶ {{ li.markedTime }} · {{ li.markedTitle }}
        </span>
        <div class="flex-1 border-t border-dashed border-indigo-400/40"></div>
      </div>

      <!-- Gap indicator -->
      <div v-else-if="li.kind === 'gap'" class="flex items-center justify-center gap-2 py-1.5 mx-6">
        <div class="flex-1 border-t border-gray-800"></div>
        <span class="text-[10px] text-gray-500">
          <template v-if="li.timeDiff">{{ li.timeDiff }}</template>
          <template v-if="li.timeDiff && li.danceCount"> · </template>
          <template v-if="li.danceCount">{{ li.danceCount }} {{ li.danceCount === 1 ? 'dance' : 'dances' }}</template>
        </span>
        <div class="flex-1 border-t border-gray-800"></div>
      </div>

      <!-- Dance or break entry -->
      <template v-else-if="li.kind === 'entry'">
        <DanceEntry
          v-if="schedule.flatEntries[li.globalIndex!].entry.type === 'dance'"
          :entry="(schedule.flatEntries[li.globalIndex!].entry as DanceEntryType)"
          :global-index="li.globalIndex!"
          :is-marked="li.globalIndex === navigation.activeIndex"
          :is-likely="navigation.activeIsLikely"
          :is-selected="li.globalIndex === navigation.selectedIndex"
          :is-watched="true"
          :watched-dancers="watchStore.getWatchedDancersForEntry(li.globalIndex!)"
          :same-studio="false"
          :progress="li.globalIndex === navigation.activeIndex ? navigation.activeProgress : 0"
          @select="handleSelect(li.globalIndex!)"
          @mark-current="handleMarkCurrent(li.globalIndex!)"
          @seek="handleSeek"
        />
        <BreakEntry
          v-else
          :entry="(schedule.flatEntries[li.globalIndex!].entry as BreakEntryType | AwardsEntry)"
          :global-index="li.globalIndex!"
          :is-marked="li.globalIndex === navigation.activeIndex"
          :is-likely="navigation.activeIsLikely"
          :is-selected="li.globalIndex === navigation.selectedIndex"
          :is-watched-awards="true"
          :progress="li.globalIndex === navigation.activeIndex ? navigation.activeProgress : 0"
          @select="handleSelect(li.globalIndex!)"
          @mark-current="handleMarkCurrent(li.globalIndex!)"
          @seek="handleSeek"
        />
      </template>
    </template>
  </div>
</template>
