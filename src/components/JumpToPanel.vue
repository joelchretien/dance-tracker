<script setup lang="ts">
import { computed, ref, nextTick, onMounted } from 'vue'
import { X, Search, Clock, Star, Trophy } from 'lucide-vue-next'
import { useScheduleStore } from '@/stores/schedule'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'
import { useUiStore } from '@/stores/ui'
import { enrichSearchResults, type EnrichedSearchResult } from '@/lib/search-enrich'
import { titleCaseDanceTitle } from '@/lib/title-case'
import { buildSearchSuggestions, matchesQuery } from '@/lib/search-suggestions'
import { localDateString, currentTimeMinutes } from '@/lib/time'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { useRecentSearches } from '@/composables/useRecentSearches'
import DancerBadge from './DancerBadge.vue'

const schedule = useScheduleStore()
const navigation = useNavigationStore()
const watchStore = useWatchStore()
const ui = useUiStore()

const emit = defineEmits<{ 'jump-to': [index: number] }>()

const dialogRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
useFocusTrap(dialogRef)

onMounted(() => {
  nextTick(() => inputRef.value?.focus())
})

const hasQuery = computed(() => ui.jumpToQuery.trim().length > 0)

// Recents are persisted per-schedule. The composable reads schedule
// meta.id reactively so a schedule swap shows the right history.
const scheduleId = computed(() => schedule.meta?.id ?? null)
const { recents, record: recordRecent, remove: removeRecent, clear: clearRecents } =
  useRecentSearches(scheduleId)

const watchedDancersByAwardsIndex = computed(() => {
  const map = new Map<number, string[]>()
  for (const block of watchStore.awardsBlocks) {
    if (block.hasWatchedDancer) map.set(block.awardsGlobalIndex, block.watchedDancersInBlock)
  }
  return map
})

const searchResults = computed<EnrichedSearchResult[]>(() =>
  enrichSearchResults(ui.jumpToQuery, {
    flatEntries: schedule.flatEntries,
    dayLabels: schedule.days.map(d => d.label),
    watchedDancerSet: watchStore.watchedDancerSet,
    watchedAwardsSet: watchStore.watchedAwardsSet,
    watchedStudios: watchStore.watchedStudios,
    watchedDancersByAwardsIndex: watchedDancersByAwardsIndex.value,
    activeIndex: navigation.activeIndex,
    activeIsLikely: navigation.activeIsLikely,
    scheduleOffsetMinutes: navigation.scheduleOffsetMinutes,
  }),
)

// Suggestions for the empty state. Recomputed reactively as nav state
// changes (e.g., user marks a different current dance, then opens search).
const suggestions = computed(() =>
  buildSearchSuggestions({
    flatEntries: schedule.flatEntries,
    dayLabels: schedule.days.map(d => d.label),
    dayDates: schedule.days.map(d => d.date),
    todayDate: localDateString(),
    nowMinutes: currentTimeMinutes(),
    nextWatchedIndex: watchStore.nextTargetIndex,
    // hasAnchor gates whether activeIndex is meaningful. Without an
    // anchor, activeIndex defaults to 0 (markedIndex's reset value),
    // which would make "previous awards" always return null and
    // "next awards" always pick the very first one — wrong in both
    // directions. Pass null in that case so the wall-clock fallback
    // runs.
    activeIndex: navigation.hasAnchor ? navigation.activeIndex : null,
  }),
)

// While typing, surface only the suggestions whose keywords match the
// typed query (prefix match against keys like "next", "previous",
// "awards"). Empty state still shows the full list.
const matchingSuggestions = computed(() =>
  suggestions.value.filter(s => matchesQuery(s, ui.jumpToQuery)),
)

// "Empty truly" — no recents, no suggestions, no watched dancers. The
// illustration only earns its place when there's nothing useful to show.
const isTrulyEmpty = computed(
  () => recents.value.length === 0 && suggestions.value.length === 0,
)

function suggestionIcon(key: string) {
  if (key === 'next-watched') return Star
  if (key === 'previous-awards') return Trophy
  if (key === 'next-awards') return Trophy
  return Search
}

function suggestionIconClass(key: string): string {
  if (key === 'next-watched') return 'text-gold-400'
  // Both awards chips share the cyan accent, but previous gets a
  // slightly muted variant to telegraph "already happened".
  if (key === 'previous-awards') return 'text-cyan-400/70'
  if (key === 'next-awards') return 'text-cyan-400'
  return 'text-gray-400'
}

function borderClass(r: EnrichedSearchResult): string {
  if (r.isMarked) return 'border-l-indigo-400'
  if (r.isWatched) return 'border-l-gold-400'
  if (r.sameStudio) return 'border-l-cyan-400/40'
  return 'border-l-transparent'
}

function bgClass(r: EnrichedSearchResult): string {
  if (r.isMarked) return 'bg-indigo-500/5'
  if (r.isWatched) return 'bg-gold-400/10'
  return 'bg-surface-raised/40'
}

function selectResult(globalIndex: number) {
  // Record before navigating — closeJumpToPanel clears the query, so we
  // need to capture it now. record() is a no-op for queries shorter
  // than the minimum length.
  recordRecent(ui.jumpToQuery)
  jumpTo(globalIndex)
}

function jumpTo(globalIndex: number) {
  // If the target isn't rendered in the current filtered list, switch to All
  // first so the scroll target's DOM element actually exists. The user
  // explicitly searched for it — they want to see it regardless of filter.
  // skipAutoJump prevents TrackerView's viewMode watcher from immediately
  // scrolling to "now" and overriding the search-jump scroll.
  if (ui.viewMode !== 'all') {
    const visibleIndices =
      ui.viewMode === 'dancers' ? watchStore.watchedEntryIndices : watchStore.studioEntryIndices
    if (!visibleIndices.includes(globalIndex)) {
      ui.setViewMode('all', { skipAutoJump: true })
    }
  }
  navigation.select(globalIndex)
  ui.closeJumpToPanel()
  emit('jump-to', globalIndex)
}

function applyRecent(query: string) {
  ui.jumpToQuery = query
  // Don't focus the input — user wants to see results, not type more.
  // The recents list bumps this query to the top via record() if they
  // do select a result from it.
}

// BASE_URL resolves to '/' in dev and '/dance-tracker/' in production.
// Public files are copied to dist verbatim, so the URL is just BASE +
// filename. Computing this at runtime rather than hard-coding the path
// keeps the asset loadable regardless of the deploy's base.
const spotlightUrl = `${import.meta.env.BASE_URL}empty-spotlight.webp`
</script>

<template>
  <div
    ref="dialogRef"
    role="dialog"
    aria-modal="true"
    aria-label="Search and jump to a dance"
    class="fixed inset-0 z-40 bg-surface flex flex-col focus:outline-none"
    style="padding-top: env(safe-area-inset-top, 0px)"
    tabindex="-1"
    @keydown.esc="ui.closeJumpToPanel()"
  >
    <div class="flex items-center gap-2 px-3 py-3 border-b border-gray-800">
      <Search :size="18" class="text-gray-500 shrink-0" />
      <input
        ref="inputRef"
        v-model="ui.jumpToQuery"
        type="text"
        placeholder="Search dances/awards..."
        class="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
      />
      <button
        class="p-1.5 rounded-lg hover:bg-surface-raised transition-colors shrink-0"
        aria-label="Close search panel"
        @click="ui.closeJumpToPanel()"
      >
        <X :size="18" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto py-1 px-2">
      <!-- Search results when typing -->
      <template v-if="hasQuery">
        <!-- Matching suggestions: surface "Next awards", "Previous awards",
             etc. when the typed query is a prefix of one of their keywords.
             Sits above text-match results so semantic shortcuts get
             priority over literal title matches. -->
        <div v-if="matchingSuggestions.length > 0" class="mt-3 mb-1">
          <div class="text-[11px] font-semibold tracking-wider uppercase text-gray-500 px-2 mb-1.5">
            Suggestions
          </div>
          <button
            v-for="s in matchingSuggestions"
            :key="s.key"
            class="w-full px-3 py-2.5 my-0.5 flex items-center gap-3 rounded-lg bg-surface-raised/40 active:bg-surface-overlay transition-colors text-left"
            @click="jumpTo(s.globalIndex)"
          >
            <component :is="suggestionIcon(s.key)" :size="18" :class="['shrink-0', suggestionIconClass(s.key)]" />
            <div class="flex-1 min-w-0">
              <div class="fs-title text-gray-200 truncate">{{ s.label }}</div>
              <div v-if="s.detail" class="text-[11px] text-gray-500 truncate">{{ s.detail }}</div>
            </div>
          </button>
        </div>

        <!-- Section header for text-match results, only when both a
             matching suggestion and at least one text result are present.
             Single-section displays don't need the header. -->
        <div
          v-if="matchingSuggestions.length > 0 && searchResults.length > 0"
          class="text-[11px] font-semibold tracking-wider uppercase text-gray-500 px-2 mt-3 mb-1.5"
        >
          Results
        </div>

        <!-- "No matches" message: only when text results AND suggestions
             are both empty. With a matching suggestion, the user has
             something to tap; we don't need to apologize. -->
        <div
          v-if="searchResults.length === 0 && matchingSuggestions.length === 0"
          class="text-center text-gray-500 text-sm py-12"
        >
          No dances match "{{ ui.jumpToQuery }}"
        </div>

        <button
          v-for="r in searchResults"
          :key="r.globalIndex"
          class="relative block w-full my-0.5 px-3 py-2 rounded-lg border-l-[3px] text-left active:bg-surface-overlay transition-colors"
          :class="[borderClass(r), bgClass(r)]"
          @click="selectResult(r.globalIndex)"
        >
          <span
            v-if="r.isMarked"
            class="absolute top-1.5 right-2 text-[9px] font-bold tracking-wider uppercase text-indigo-400/80"
          >{{ r.isLikely ? '~ current' : '▶ current' }}</span>

          <div class="flex items-baseline gap-2">
            <div class="shrink-0 w-20">
              <div class="fs-time text-gray-300 leading-tight">{{ r.displayTime }}</div>
              <div class="text-[10px] text-gray-500 leading-tight uppercase tracking-wide">
                <span>{{ r.dayShort }}</span><span v-if="r.hasOffset"> · {{ r.time }}</span>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div
                class="fs-title font-medium truncate"
                :class="r.isWatched ? 'text-gold-400' : 'text-gray-200'"
              >{{ titleCaseDanceTitle(r.title) }}</div>
              <div v-if="r.subtitle" class="text-[11px] text-gray-500 truncate">{{ r.subtitle }}</div>
            </div>
            <span v-if="r.num" class="fs-time text-gray-500 shrink-0">#{{ r.num }}</span>
          </div>

          <div v-if="r.watchedDancers.length" class="flex flex-wrap gap-1 mt-1">
            <DancerBadge v-for="name in r.watchedDancers" :key="name" :name="name" />
          </div>
        </button>
      </template>

      <!-- Empty state: suggestions, then recents, then illustration fallback. -->
      <template v-else>
        <!-- Suggestions: Next watched dance, Previous awards, Next awards.
             Tappable shortcuts that bypass typing entirely. -->
        <div v-if="suggestions.length > 0" class="mt-3 mb-1">
          <div class="text-[11px] font-semibold tracking-wider uppercase text-gray-500 px-2 mb-1.5">
            Suggestions
          </div>
          <button
            v-for="s in suggestions"
            :key="s.key"
            class="w-full px-3 py-2.5 my-0.5 flex items-center gap-3 rounded-lg bg-surface-raised/40 active:bg-surface-overlay transition-colors text-left"
            @click="jumpTo(s.globalIndex)"
          >
            <component :is="suggestionIcon(s.key)" :size="18" :class="['shrink-0', suggestionIconClass(s.key)]" />
            <div class="flex-1 min-w-0">
              <div class="fs-title text-gray-200 truncate">{{ s.label }}</div>
              <div v-if="s.detail" class="text-[11px] text-gray-500 truncate">{{ s.detail }}</div>
            </div>
          </button>
        </div>

        <!-- Recent searches: persisted per schedule, capped at 8. The
             individual X removes one entry; "Clear" resets the list. -->
        <div v-if="recents.length > 0" class="mt-3 mb-1">
          <div class="px-2 mb-1.5 flex items-center justify-between">
            <span class="text-[11px] font-semibold tracking-wider uppercase text-gray-500">
              Recent
            </span>
            <button
              class="text-[11px] font-medium text-gray-500 active:text-gray-300 transition-colors"
              @click="clearRecents()"
            >
              Clear
            </button>
          </div>
          <div
            v-for="q in recents"
            :key="q"
            class="flex items-center gap-2 my-0.5 rounded-lg bg-surface-raised/40 active:bg-surface-overlay transition-colors"
          >
            <button
              class="flex-1 px-3 py-2.5 flex items-center gap-3 text-left min-w-0"
              @click="applyRecent(q)"
            >
              <Clock :size="16" class="text-gray-500 shrink-0" />
              <span class="fs-title text-gray-300 truncate">{{ q }}</span>
            </button>
            <button
              class="px-3 py-2.5 text-gray-600 active:text-gray-300 shrink-0"
              :aria-label="`Remove '${q}' from recent searches`"
              @click="removeRecent(q)"
            >
              <X :size="14" />
            </button>
          </div>
        </div>

        <!-- Illustration: only when there's nothing actionable to show.
             Earns its space by filling vertical void in a true empty state
             (first-run users with no anchor, no watched dancers, no recents). -->
        <div v-if="isTrulyEmpty" class="flex flex-col items-center pt-12 pb-6">
          <img
            :src="spotlightUrl"
            alt=""
            class="w-32 h-32 opacity-85"
            aria-hidden="true"
          />
          <div class="text-sm text-gray-400 mt-2 text-center px-6">
            Search for a dance, dancer, or studio
          </div>
          <div class="text-[11px] text-gray-600 mt-1 text-center px-6">
            Tap a result to jump to it in the schedule
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
