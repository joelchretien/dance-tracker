# Dance Tracker — Code Audit

**Audited:** April 13, 2026
**Commit:** current `main`
**Stack:** Vue 3.5 + Pinia + TypeScript + Tailwind 4 + Vite 6
**Build status:** ✅ compiles clean (`vue-tsc --noEmit` zero errors)
**Test status:** ✅ 57/57 passing across 7 test files

---

## 1. Codebase Overview

| Metric | Value |
|---|---|
| Source LOC (no tests) | 2,219 |
| Test LOC | 325 |
| Total LOC | 2,544 |
| Vue components | 18 |
| Pinia stores | 4 |
| Pure lib modules | 7 |
| Composables | 1 |
| Test files | 7 (all in `src/__tests__/lib/`) |
| Test-to-source ratio | ~15% |

### LOC per file (top 10)

| Lines | File | Notes |
|---|---|---|
| 188 | `components/WatchedDancesList.vue` | Most complex component |
| 181 | `stores/watch.ts` | Heaviest store |
| 140 | `views/TrackerView.vue` | Main orchestrator view |
| 132 | `stores/navigation.ts` | Navigation + font size |
| 110 | `components/JumpToPanel.vue` | Search overlay |
| 108 | `stores/ui.ts` | UI state bag |
| 96 | `stores/schedule.ts` | Data loading + computed indices |
| 89 | `components/WatchPanel.vue` | Dancer selection |
| 85 | `components/DanceEntry.vue` | Core list entry |
| 79 | `components/CountdownBanner.vue` | Multi-state banner |

No single file exceeds 200 lines. This is well-managed for a project of this scope.

---

## 2. Architecture Assessment

**Overall verdict: Clean and well-structured.**

The codebase follows a sensible layered architecture:

- **`src/lib/`** — Pure functions with zero framework dependencies. All business logic is testable in isolation. This is the strongest part of the codebase.
- **`src/stores/`** — Pinia stores handle state and coordinate between lib functions and the UI.
- **`src/components/`** — Presentational components that receive props and emit events.
- **`src/views/`** — Page-level orchestrators that wire stores to components.
- **`src/composables/`** — Reusable Vue composition functions.

The separation of pure logic into `src/lib/` is excellent engineering. It makes the most important code (time parsing, navigation, awards block computation, fuzzy search) trivially testable without any Vue or DOM dependencies.

---

## 3. KISS — Keep It Simple, Stupid

### ✅ What's done well

- **Time handling** — `parseTime` returns minutes-since-midnight, a dead-simple representation that makes all arithmetic trivial. No Date objects, no timezone headaches for intra-day math.
- **Discriminated unions** — `ScheduleEntry = DanceEntry | BreakEntry | AwardsEntry` is clean, type-safe, and idiomatic TypeScript.
- **Font scaling** — CSS custom properties with `calc(var(--fs-scale) * ...)` is elegant. No JS reflows, no re-rendering.
- **Schedule status** — `classifyScheduleStatus` is a pure function with 5 clear thresholds. Easy to reason about, easy to test.

### ⚠️ Opportunities

| Location | Issue | Suggestion |
|---|---|---|
| `WatchedDancesList.vue` | The `listItems` computed (lines 31–120) builds a complex interleaved list of 4 item kinds with gap/marker insertion logic. It's the hardest code in the project to follow. | Extract the list-building logic into a pure function in `src/lib/` so it can be unit-tested independently. The component should just render the output. |
| `stores/watch.ts` | 181 lines with 18 exports. It handles dancer toggling, awards block computation, next-target finding, countdown formatting, and watched-entry filtering. | Split into two stores or extract the "next target" countdown logic into a separate composable. The store is doing two jobs: managing the watch list and computing derived countdown state. |

---

## 4. DRY — Don't Repeat Yourself

### 🔴 `DanceEntry.vue` / `BreakEntry.vue` — duplicated styling logic

Both components independently compute `borderClass`, `bgClass`, and `outlineStyle` using nearly identical conditional logic based on `isMarked`, `isSelected`, and watched status. The patterns are:

```
DanceEntry:  isMarked → 'border-l-indigo-400'    isWatched → 'border-l-gold-400'
BreakEntry:  isMarked → 'border-indigo-400'       isWatchedAwards → 'border-gold-400/50'
```

The `bgClass` and `outlineStyle` computed properties are *identical* between both components.

**Recommendation:** Extract a `useEntryStyles(isMarked, isSelected, isWatched)` composable that returns `{ borderClass, bgClass, outlineStyle }`. Each component can augment the border class for its specific variant.

### 🔴 `bottomPx` calculation — duplicated in two places

Both `SnapbackPill.vue` and `ToastNotification.vue` independently measure `#bottom-bar` height on mount:

```ts
const bottomPx = ref(140)  // or 160
onMounted(() => {
  const bot = document.getElementById('bottom-bar')
  if (bot) { bottomPx.value = bot.offsetHeight + 12 }
})
```

**Recommendation:** Extract a `useBottomBarOffset(defaultPx)` composable, or expose the bottom bar height from the UI store so both components can react to it.

### 🟡 Select/mark-current handler pattern

`ScheduleList.vue` and `WatchedDancesList.vue` both define:

```ts
function handleSelect(globalIndex: number) { navigation.select(globalIndex) }
function handleMarkCurrent(globalIndex: number) { navigation.markAsCurrent(globalIndex) }
```

These are trivial one-liners so the duplication is low-cost, but if more entry-level actions are added (e.g. "add to favorites"), a shared composable would prevent drift.

---

## 5. SOLID Principles

### Single Responsibility ✅ (mostly)

- Each `src/lib/` module has one job. `time.ts` parses time, `awards.ts` computes awards blocks, `fuzzy-search.ts` scores matches. Excellent.
- `stores/navigation.ts` handles both cursor navigation *and* font size. Font size is a UI preference, not navigation. Consider moving font-size state to `ui.ts`.
- `stores/ui.ts` is a grab-bag of panel open/close flags, toast state, snapback visibility, and schedule status. It's a "UI junk drawer." This is common in small apps and acceptable at this scale, but watch for growth.

### Open/Closed ✅

- The `ScheduleEntry` discriminated union is extensible — adding a new entry type (e.g., `type: 'intermission'`) only requires adding to the union and handling the new case in rendering. Existing code doesn't need to change.
- The `ScheduleStatus` union is similarly well-designed.

### Interface Segregation ⚠️

- `stores/watch.ts` exposes 18 items from its return object. Components like `CountdownBanner.vue` only need 8 of them. This isn't a real problem in Vue/Pinia (tree-shaking is at the template level), but it indicates the store is doing too much — see the SRP note above.

### Dependency Inversion ⚠️

- Components import stores directly: `useScheduleStore()`, `useNavigationStore()`, etc. This is standard Pinia practice and fine for this app size, but it means components cannot be tested without mocking entire stores. The pure `src/lib/` layer partially mitigates this since the critical logic doesn't depend on stores.
- `stores/ui.ts` calls `useScheduleStore()` and `useNavigationStore()` inside `updateScheduleStatus()`. Store-to-store dependencies are a known Pinia pattern but create implicit coupling. If the dependency graph grows, consider passing data as arguments instead.

---

## 6. YAGNI — You Aren't Gonna Need It

**This codebase is remarkably lean.** Almost every feature serves an obvious user need for tracking dances at a competition. There is very little speculative code.

Minor observations:

| Item | Assessment |
|---|---|
| Multi-schedule support (`ScheduleManifest`) | Currently only 1 schedule in `index.json`, but the HomeView auto-redirects for single-schedule manifests. This is forward-thinking, not wasteful — the infrastructure cost is ~20 lines. ✅ |
| `SearchResult` interface in `fuzzy-search.ts` | Defined in the lib file but only used in `JumpToPanel.vue`. Could live in the component or types file, but this is trivial. |
| `AwardsBlock.blockStartIndex` | Computed but never read outside of `computeAwardsBlocks` internal logic and the `hasWatchedDancer` check. Verify this field is actually needed in the consumer. |

**No dead code detected.** No unused imports, no commented-out blocks, no feature flags for unfinished work.

---

## 7. Test Coverage

### ✅ What's covered

All 7 `src/lib/` modules have corresponding test files with good edge-case coverage:

- `time.test.ts` — 14 tests covering AM/PM, noon, midnight, invalid input
- `navigation.test.ts` — 10 tests covering day boundaries, before/after ranges
- `countdown.test.ts` — 9 tests including breaks, adjacent entries, edge cases
- `fuzzy-search.test.ts` — 10 tests validating scoring heuristics
- `awards.test.ts` — 4 tests for block computation
- `schedule-status.test.ts` — 6 tests for all status classifications
- `category.test.ts` — 4 tests

### 🔴 What's not covered

| Gap | Risk |
|---|---|
| **No store tests** | `stores/watch.ts` has complex derived state (awards blocks, next-target computation, countdown). A bug here would silently show wrong countdown numbers. |
| **No component tests** | Acceptable for a small app, but `WatchedDancesList.vue`'s interleaved list-building logic is complex enough to warrant testing. |
| **No integration/E2E tests** | The app is mobile-first and used in time-sensitive contexts (live competitions). A single Playwright smoke test loading a schedule and advancing would catch regressions fast. |
| **Service worker untested** | The caching strategies (network-first for JSON, cache-first for hashed assets) are correct by inspection, but an error in the SW could silently serve stale schedule data during a live event. |

---

## 8. Potential Bugs & Robustness

### 🔴 Service worker cache versioning

`CACHE_NAME` is hardcoded to `'dance-tracker-v1'` and never changes. The SW cleans caches that *don't* match this name, but since the name never changes, old cached responses for non-hashed URLs (like `schedules/destiny-2026.json`) persist indefinitely even after the data changes.

The network-first strategy *should* prevent stale data when online, but if the user is offline or on a flaky auditorium WiFi, they'll get whatever was last cached — possibly a previous version of the schedule.

**Fix:** Embed the git hash in `CACHE_NAME` (e.g., `dance-tracker-${__GIT_HASH__}`) so every deploy invalidates the cache. The `vite.config.ts` already computes the git hash — the SW just needs access to it.

### 🟡 `document.getElementById` for scrolling

`TrackerView.vue` uses `document.getElementById('entry-${index}')` to scroll to entries. This works but bypasses Vue's reactivity and ref system. If the DOM element doesn't exist yet (race condition with `v-if`), the scroll silently fails.

**Mitigation:** The `nextTick()` calls before scrolling largely prevent this, but a `MutationObserver` fallback or retry pattern would be more robust.

### 🟡 No schedule data validation

`loadSchedule()` checks for `data.meta` and `Array.isArray(data.days)` but doesn't validate entry shapes. A malformed entry (e.g., missing `type` field) would cause template rendering errors that bubble to the App-level error boundary.

**Recommendation:** Add a lightweight runtime validator or at least a `try/catch` around the flatEntries computation.

### 🟡 `parseTime` only supports 12-hour format

If schedule data ever uses 24-hour time (e.g., `"14:30"`), `parseTime` returns `-1` and the entry becomes invisible to all time-based features (schedule status, jump-to-now, countdown).

---

## 9. Accessibility

The `Claude.md` mentions protan color-blind accessibility as a convention, which is good. However:

| Issue | Severity |
|---|---|
| No `aria-label` on icon-only buttons (Search, Filter, Settings in TopBar) | Medium — screen readers will announce nothing for these buttons |
| Entry list has no keyboard navigation | Low — app is mobile-first, but keyboard users on desktop can't navigate entries |
| Color alone distinguishes watched (gold) vs current (indigo) vs default entries | Medium — the `border-l-[3px]` and `▶ current` badge help, but there's no shape/icon differentiator for watched entries in the main list (only the gold star badge on dancer names) |
| Toast notifications are not `role="alert"` or `aria-live` | Low — they auto-dismiss in 1.8s and screen readers won't announce them |

---

## 10. Performance

No concerns at current scale. The schedule has ~300 entries across 2 days (~5k lines of JSON). All computeds are O(n) linear scans over flat arrays, which is fine up to thousands of entries.

One watch (no pun intended): `watchStore.isWatchedEntry()` and `getWatchedDancersForEntry()` are called per-entry in the render loop of `ScheduleList.vue`. These do linear scans of the dancer array for each entry. With large schedules and many watched dancers, this could become O(n·m). The `watchedDancerSet` computed (a `Set`) already optimizes the lookup, so this is actually O(n) total. No action needed.

---

## 11. Summary of Recommendations

### High Priority

1. **Add store-level tests** for `watch.ts` — the countdown and awards-block logic is the app's most complex and most user-visible behavior.
2. **Fix SW cache versioning** — embed git hash in `CACHE_NAME` to prevent stale data during live events.
3. **Extract `WatchedDancesList` list-building logic** into a pure function in `src/lib/` for testability.

### Medium Priority

4. **Extract shared entry styling** into a `useEntryStyles` composable to DRY up `DanceEntry.vue` / `BreakEntry.vue`.
5. **Extract `bottomPx` measurement** into a shared composable or store value.
6. **Move font-size state** from `navigation.ts` to `ui.ts` (SRP).
7. **Add `aria-label`** to icon-only buttons in `TopBar.vue`.

### Low Priority

8. **Add a lightweight smoke E2E test** with Playwright — load schedule, verify entries render, advance one step.
9. **Add schedule data validation** in `loadSchedule` to catch malformed JSON gracefully.
10. **Consider splitting `watch.ts`** into watch-list management and countdown-computation concerns.

---

## 12. What This Codebase Gets Right

This deserves emphasis because it's genuinely well-built:

- **Pure logic in `src/lib/`** with comprehensive tests is a pattern many larger codebases fail to achieve. It makes refactoring safe and reasoning easy.
- **No dead code.** Every file, every export, every computed is used. The author has been disciplined about not leaving speculative code around.
- **Consistent conventions.** Naming, file organization, component structure, and Tailwind usage are uniform throughout. The `Claude.md` documents real conventions that are actually followed.
- **Right-sized components.** Nothing is over 200 lines. Extraction happens at natural boundaries (DancerBadge, DanceDetails, CategoryHeader).
- **TypeScript is used meaningfully** — discriminated unions for entry types, proper typing on store returns, no `any` leakage (except the unavoidable `*.vue` module declaration).
- **Mobile-first design decisions** are evident everywhere: touch manipulation, safe area handling, env() usage, dark theme optimized for auditoriums.

This is a focused, well-crafted tool that does one thing and does it well.
