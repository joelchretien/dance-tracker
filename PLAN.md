# Dance Tracker — Vue 3 Rebuild Plan

## Context

A clean-slate rebuild of the dance competition tracker as a proper Vue 3 application. The existing `Destiny.html` and `HANDOFF.md` remain in the repo untouched — they are not part of this plan. `Destiny.html` continues to be served at its current URL during and after the transition. The new app is served from `index.html` going forward. Goals:

1. **Separates data from code** — schedule files live in a `schedules/` directory as JSON, one per competition
2. **Cleans up the data model** — day headers become structural (template-level), not data entries; boolean flags become explicit `type` discriminators; category is a single display-ready string
3. **Removes "daughter" terminology** — all code, variables, and UI labels use "watched dancer" instead
4. **Deploys via GitHub Actions** — Vite build output goes to GitHub Pages

---

## 1. Project Scaffolding

### Tech stack

| Package | Why |
|---------|-----|
| **Vue 3** + **TypeScript** | Composition API + `<script setup>` |
| **Pinia** | State management with devtools support |
| **Vue Router** | URL-based schedule selection (`/:scheduleId`), proper deep linking |
| **Tailwind CSS v4** | Utility-first CSS, dark mode built-in, eliminates custom CSS files |
| **@vueuse/core** | Battle-tested composables — replaces 4 custom ones we'd write ourselves |
| **lucide-vue-next** | Tree-shakeable icons (star, clock, info, type, chevrons) |
| **Vite** | Build tooling |
| **Vitest** | Unit testing (same config as Vite) |

**@vueuse/core** is the biggest win here — it provides exactly the composables we need:
- `useLocalStorage` — reactive localStorage with auto-serialization and namespacing
- `useIntersectionObserver` — snapback pill visibility detection
- `useIntervalFn` — 30-second schedule status refresh
- `useScroll` — scroll direction for snapback pill arrow

This eliminates all 4 planned custom composables.

### Directory structure

```
dance-tracker/
├── index.html                    # Vite entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts            # Tailwind v4 theme customization
├── .github/workflows/deploy.yml
├── public/
│   └── schedules/
│       ├── index.json            # Manifest listing available schedules
│       └── destiny-rising-2025.json
└── src/
    ├── main.ts
    ├── main.css                  # Tailwind imports + custom theme tokens
    ├── App.vue
    ├── router.ts                 # Vue Router: / (selector) and /:scheduleId (tracker)
    ├── types/
    │   └── schedule.ts
    ├── lib/                      # Pure functions (no Vue deps, trivially testable)
    │   ├── time.ts
    │   ├── awards.ts
    │   ├── countdown.ts
    │   ├── category.ts
    │   ├── schedule-status.ts
    │   └── navigation.ts
    ├── stores/
    │   ├── schedule.ts
    │   ├── navigation.ts
    │   ├── watch.ts
    │   └── ui.ts
    ├── composables/
    │   └── useSnapback.ts        # Thin wrapper combining useIntersectionObserver + useScroll
    ├── components/
    │   ├── TopBar.vue
    │   ├── FontSizeButton.vue
    │   ├── JumpToNowButton.vue
    │   ├── WatchButton.vue
    │   ├── DetailsToggleButton.vue
    │   ├── ProgressBar.vue
    │   ├── ScheduleStatus.vue
    │   ├── ScheduleList.vue
    │   ├── DayHeader.vue
    │   ├── CategoryHeader.vue
    │   ├── BreakEntry.vue
    │   ├── DanceEntry.vue
    │   ├── DanceDetails.vue
    │   ├── DancerBadge.vue
    │   ├── DancerChip.vue
    │   ├── SnapbackPill.vue
    │   ├── BottomBar.vue
    │   ├── CountdownBanner.vue
    │   ├── NavButtons.vue
    │   ├── WatchPanel.vue
    │   ├── WatchSearch.vue
    │   ├── WatchDancerList.vue
    │   ├── WatchDancerItem.vue
    │   ├── ToastNotification.vue
    │   └── ScheduleSelector.vue
    ├── views/
    │   ├── HomeView.vue          # Schedule selector page
    │   └── TrackerView.vue       # Main tracker (loads schedule by route param)
    └── __tests__/
        └── lib/
            ├── time.test.ts
            ├── awards.test.ts
            ├── countdown.test.ts
            ├── category.test.ts
            ├── schedule-status.test.ts
            └── navigation.test.ts
```

**Key vite.config.ts settings:**
- `base: '/dance-tracker/'` (required for GitHub Pages subpath)
- `@tailwindcss/vite` plugin for Tailwind v4

---

## 2. Schedule JSON Format

### Why runtime fetch (not build-time import)

Files in Vite's `public/` directory are copied as-is to `dist/`. At runtime the app fetches them. This wins because:
- Adding a new competition = adding a JSON file. No rebuild, no code changes.
- ~80KB of schedule data stays out of the JS bundle.
- GitHub Pages serves static JSON with correct MIME types.
- Future service worker can cache for offline.

### Manifest: `public/schedules/index.json`

```json
{
  "schedules": [
    { "id": "destiny-rising-2025", "name": "Destiny Rising 2025", "file": "destiny-rising-2025.json" }
  ]
}
```

### Schedule file: `public/schedules/destiny-rising-2025.json`

```json
{
  "meta": {
    "id": "destiny-rising-2025",
    "name": "Destiny Rising 2025"
  },
  "days": [
    {
      "date": "2025-04-11",
      "label": "SATURDAY APRIL 11",
      "entries": [
        {
          "type": "dance",
          "num": 282,
          "time": "8:00 AM",
          "title": "MONEY",
          "category": "Pre-Competitive · Nova · Jazz · Small Group",
          "studio": "F",
          "dancers": ["Lakelynn Baxter", "Cree Hook", "..."],
          "age": 10
        },
        { "type": "awards", "time": "9:58 AM", "title": "AWARDS #6" },
        { "type": "break", "time": "2:13 PM", "title": "PROP CLEAN UP" }
      ]
    },
    {
      "date": "2025-04-12",
      "label": "SUNDAY APRIL 12",
      "entries": [...]
    }
  ]
}
```

**Design principles:**
- **`category` is a single display-ready string** — not a structured object. Different competitions have different categorization schemes. The string is used directly for section headers and grouping. For the countdown banner's shorter subtitle, the app takes the last 2 segments (split by ` · `) as a reasonable heuristic.
- **No `isDH` entries** — days are structural (`days[]` array), headers rendered by template
- **Explicit `type`** — `"dance" | "break" | "awards"` replaces boolean `isBreak`/`isDH`
- **Optional fields** — only `type`, `time`, and `title` are required on every entry. `num`, `studio`, `category`, `dancers`, `age` are only present when they exist. This means a bare-bones competition schedule can work with just titles and times.

### One-time conversion script

A throwaway Node.js script (`scripts/convert-schedule.js`) extracts the SATURDAY/SUNDAY arrays from the existing data, parses pipe-delimited categories, classifies entry types, and emits the new JSON format. Does not ship with the app.

---

## 3. TypeScript Interfaces

File: `src/types/schedule.ts`

```ts
// -- JSON file types --
export interface ScheduleFile {
  meta: ScheduleMeta
  days: ScheduleDay[]
}
export interface ScheduleMeta { id: string; name: string }
export interface ScheduleDay { date: string; label: string; entries: ScheduleEntry[] }

export type ScheduleEntry = DanceEntry | BreakEntry | AwardsEntry

export interface DanceEntry {
  type: 'dance'
  time: string
  title: string
  num?: number           // entry number (not all competitions use these)
  studio?: string        // room/stage letter
  category?: string      // display-ready string, e.g. "Competitive · Nova · Jazz · Solo"
  dancers?: string[]     // omit if competition doesn't list dancers (watch feature disabled)
  age?: number           // age category
}
export interface BreakEntry { type: 'break'; time: string; title: string }
export interface AwardsEntry { type: 'awards'; time: string; title: string }

// -- Internal indexed types (derived at load time) --
export interface IndexedEntry {
  entry: ScheduleEntry
  dayIndex: number       // 0 = first day, 1 = second day, ...
  globalIndex: number    // position in the flattened array
}

export interface AwardsBlock {
  awardsGlobalIndex: number
  blockStartIndex: number
  hasWatchedDancer: boolean
}
```

### The flattened index pattern

At load time, `days[].entries[]` is flattened into a single `IndexedEntry[]` array. This preserves the existing navigation model (single integer index for prev/next/localStorage) while keeping day headers out of the data. Day boundaries are detected by comparing `dayIndex` of adjacent entries — no sentinel entries needed.

---

## 4. Pinia Stores

### `scheduleStore` — static, read-only after load
- **State:** `scheduleFile`, `flatEntries: IndexedEntry[]`, `loading`, `error`
- **Getters:** `allDancers` (sorted unique), `danceIndices`, `totalDances`, `awardsIndices`, `days`, `meta`, `isLoaded`
- **Actions:** `loadSchedule(id)`, `loadManifest()`

### `navigationStore` — user position
- **State:** `currentIndex` (persisted via `useLocalStorage` from @vueuse), `showDetails` (not persisted), `fontSize` (persisted via `useLocalStorage`)
- **Getters:** `currentEntry`, `currentDayIndex`, `currentDanceNumber`, `progressPercent`, `canGoPrev`, `canGoNext`
- **Actions:** `goTo(i)`, `goNext()`, `goPrev()`, `toggleDetails()`, `cycleFontSize()`, `jumpToNow()` (returns scroll target, does NOT change currentIndex)

### `watchStore` — watched dancer tracking
- **State:** `watchedDancers: string[]` (persisted)
- **Getters:** `watchedDancerSet`, `watchedStudios`, `awardsBlocks`, `watchedAwardsSet`, `nextTargetIndex`, `dancesUntilTarget`, `timeUntilTarget`, `nextTargetEntry`, `nextTargetWatchedDancers`, `nextTargetStyleType`
- **Actions:** `toggleDancer(name)`, `restoreFromStorage()`

### `uiStore` — transient, nothing persisted
- **State:** `watchPanelOpen`, `watchSearchQuery`, `toastMessage`, `toastTimerId`, `snapbackVisible`, `snapbackDirection`, `scheduleStatus`
- **Actions:** `showToast(msg)`, `clearToast()`, `openWatchPanel()`, `closeWatchPanel()`, `setSnapback(visible, direction)`, `updateScheduleStatus()`

---

## 5. Pure Business Logic (`src/lib/`)

All core logic lives as pure functions with zero Vue/Pinia dependencies. This is the most testable layer.

| Module | Key functions |
|--------|--------------|
| `time.ts` | `parseTime("8:03 AM") → 483`, `formatTimeDiff(from, to)`, `currentTimeMinutes()` |
| `awards.ts` | `computeAwardsBlocks(flatEntries, awardsIndices, watchedSet) → AwardsBlock[]` |
| `countdown.ts` | `findNextTarget(flatEntries, currentIndex, watchedSet, watchedAwards) → index \| null`, `countDancesBetween(flatEntries, from, to) → number` |
| `category.ts` | `extractSubtitle(cat) → "Jazz · Small Group"` (last 2 segments of category string, for countdown banner) |
| `schedule-status.ts` | `classifyScheduleStatus(entryTime, now, entryDay, today) → ScheduleStatus` |
| `navigation.ts` | `findNowIndex(flatEntries, nowMinutes, targetDayIndex) → index` |

---

## 6. ScheduleList Rendering — Day Headers & Category Separators

Since day headers and category separators are **not** entries in the flat array, they're injected by template logic:

```vue
<template v-for="(item, i) in flatEntries" :key="item.globalIndex">
  <!-- Day header when dayIndex changes -->
  <DayHeader v-if="i === 0 || item.dayIndex !== flatEntries[i-1].dayIndex"
    :day="days[item.dayIndex]" />

  <!-- Category header when category changes (dance entries only, reset after breaks) -->
  <CategoryHeader v-if="shouldShowCategoryHeader(item, i)"
    :category="item.entry.category" />

  <!-- The entry itself -->
  <DanceEntry v-if="item.entry.type === 'dance'" ... />
  <BreakEntry v-else ... />
</template>
```

Category separator logic (matching current behavior): show header when a dance entry's category differs from the previous dance entry's category, OR after any break/awards entry resets the tracker.

---

## 6b. Tailwind CSS & Dark Theme

### Tailwind v4 setup

Tailwind v4 uses CSS-first configuration. In `src/main.css`:

```css
@import "tailwindcss";

@theme {
  /* Color system from existing app */
  --color-gold-400: #fbbf24;        /* watched dancers, their dances, countdown */
  --color-indigo-500: #6366f1;      /* current selection, interactive elements */
  --color-cyan-400: #22d3ee;        /* same-studio indicator */
  --color-surface: #1a1a2e;         /* main background */
  --color-surface-raised: #16213e;  /* card/entry background */
  --color-surface-overlay: #0f3460; /* panels, overlays */
}
```

### Dark theme approach

The app is **always dark** (designed for auditorium use) — no light/dark toggle needed. Tailwind's `dark:` variant is unnecessary. Instead, set dark colors directly via the custom theme tokens above and use them in utility classes:

```html
<div class="bg-surface text-gray-100 min-h-screen">
```

### Font size toggle with Tailwind

Three levels controlled by a CSS class on `<html>`, using CSS custom properties that Tailwind utilities reference:

```css
:root { --fs-scale: 1; }
:root.fs-medium { --fs-scale: 1.15; }
:root.fs-large { --fs-scale: 1.3; }
```

Components use `text-[length:calc(var(--fs-scale)*0.875rem)]` or simpler: define named sizes in the theme that reference the scale variable.

### Touch handling (global in `main.css`)

```css
@layer base {
  * { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
}
```

### Icons via lucide-vue-next

```vue
<script setup>
import { Star, Clock, Info, Type } from 'lucide-vue-next'
</script>
<template>
  <Star :size="20" class="text-gold-400" />
</template>
```

Tree-shaken — only imported icons end up in the bundle.

---

## 7. Vue Router

File: `src/router.ts`

Two routes:
- `/` — `HomeView.vue` — fetches manifest, shows schedule selector (or auto-redirects if only one schedule)
- `/:scheduleId` — `TrackerView.vue` — loads the schedule, renders the full tracker UI

```ts
const routes = [
  { path: '/', component: HomeView },
  { path: '/:scheduleId', component: TrackerView, props: true },
]
```

Uses `createWebHashHistory()` (hash mode) because GitHub Pages doesn't support SPA fallback routing natively. URLs look like `joelchretien.github.io/dance-tracker/#/destiny-rising-2025` — functional and shareable without any server config.

The `TrackerView` component watches the `scheduleId` route param, calls `scheduleStore.loadSchedule(scheduleId)`, and restores localStorage state for that schedule.

---

## 8. GitHub Actions Deployment

File: `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: '${{ steps.deployment.outputs.page_url }}' }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Uses the modern `actions/deploy-pages` approach. Requires the repo's Pages settings to be set to "Deploy from GitHub Actions" (not "Deploy from a branch").

---

## 9. localStorage Namespacing (via @vueuse `useLocalStorage`)

All keys prefixed with `dt:{scheduleId}:` to support multiple competitions. VueUse's `useLocalStorage` handles serialization and reactivity:

```ts
// In navigationStore, scoped to current schedule
const currentIndex = useLocalStorage(`dt:${scheduleId}:nav`, 0)
const fontSize = useLocalStorage<FontSize>(`dt:${scheduleId}:fontSize`, 'default')

// In watchStore
const watchedDancers = useLocalStorage<string[]>(`dt:${scheduleId}:watch`, [])

// Global
const lastSchedule = useLocalStorage('dt:lastSchedule', '')
```

A one-time migration function checks for legacy keys (`dst`, `dw`, `dfs`) and migrates them to the new namespace on first load.

---

## 10. "Daughter" → "Watched Dancer" Rename Checklist

Every old reference gets a clean equivalent:

| Old (Destiny.html) | New (Vue rebuild) |
|---------------------|-------------------|
| `DN` (Daughter Names) | `watchedDancers` |
| `DAWARDS` | `watchedAwardsSet` |
| `isDaughterAwards(i)` | computed in `watchStore.watchedAwardsSet.has(i)` |
| `isD(e)` (is Daughter) | `isWatchedEntry(entry, watchedSet)` |
| `wD(e)` (watched Daughters) | `getWatchedDancers(entry, watchedSet)` |
| `hasDaughter` (in ABLOCKS) | `hasWatchedDancer` |
| "Your girls are in this block" | "Your dancers are in this block" |
| "★ Watching [name]" | Same — this is fine |

---

## 11. Implementation Sequence

### Phase A: Foundation
1. `npm create vite@latest` with Vue + TS template, add Pinia, Vue Router, Tailwind v4, @vueuse/core, lucide-vue-next, Vitest
2. Define all TypeScript interfaces in `src/types/schedule.ts`
3. Write one-time conversion script, generate `destiny-rising-2025.json` + `index.json`
4. Implement `src/lib/` pure functions with full test suites
5. Set up GitHub Actions workflow (deploys skeleton app + Destiny.html)

### Phase B: Stores & Core UI
6. Implement all 4 Pinia stores
7. Build `App.vue` with schedule loading flow and `ScheduleSelector.vue`
8. Build `ScheduleList.vue` with day headers, category separators, entry components
9. Wire up navigation (prev/next/tap-to-select), bottom bar, progress bar

### Phase C: Watch System & Features
10. Build `WatchPanel.vue` with search and toggle
11. Build `CountdownBanner.vue` (ON NOW / X dances until / Up next)
12. Build `SnapbackPill.vue` with IntersectionObserver composable
13. Build `ScheduleStatus.vue` with 30-second interval refresh
14. Implement font size toggle, dark theme CSS, toast notifications

### Phase D: Polish & Deploy
15. End-to-end test on iOS Safari (the primary target device)
16. localStorage migration from legacy keys
17. Verify GitHub Pages deployment with correct base path

---

## 12. Verification Plan

1. **Unit tests:** `npm run test` — all `src/lib/` functions have test coverage
2. **Dev server:** `npm run dev` — manually walk through schedule navigation, watch toggling, countdown, awards highlighting
3. **iOS Safari:** Test on actual iPhone — touch handling, no double-tap zoom, scroll behavior, snap-back pill
4. **GitHub Pages:** Push to main, verify Actions workflow succeeds, check `joelchretien.github.io/dance-tracker/` loads correctly
5. **Deep link:** Verify `/#/destiny-rising-2025` auto-loads without selector

---

## Critical Files (new, created by this plan)

| File | Role |
|------|------|
| `src/types/schedule.ts` | All interfaces — every other file depends on these |
| `src/lib/awards.ts` | Most complex logic (awards blocks + watched dancer intersection) |
| `src/stores/watch.ts` | Central reactive store bridging static schedule with dynamic user state |
| `src/router.ts` | Vue Router with hash-mode routing for GitHub Pages |
| `public/schedules/destiny-rising-2025.json` | First schedule data file |
| `.github/workflows/deploy.yml` | Build + deploy pipeline |
