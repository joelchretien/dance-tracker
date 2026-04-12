# Dance Competition Tracker — Staff Engineer Handoff

> **Note:** This document describes the original vanilla JS version (`Destiny.html`). The app has since been rebuilt in Vue 3. See `README.md` for current architecture and documentation.

## Executive Summary

A mobile-first web app that lets parents track their children through a multi-day dance competition schedule of 350+ entries. The parent advances through the schedule manually and the app tells them what's coming next for their kids, how far behind/ahead schedule the competition is running, and which studio to watch.

**Live:** https://joelchretien.github.io/dance-tracker/Destiny.html
**Repo:** https://github.com/joelchretien/dance-tracker

Currently a single 90KB HTML file with vanilla JS. The ask is to rebuild in Vue with stores, unit tests, and proper architecture.

---

## What It Does (Feature Inventory)

### Core Navigation
- **Linear schedule traversal** — PREV/NEXT buttons at the bottom advance through a combined Saturday + Sunday schedule
- **Tap to select** — tapping any entry in the list sets it as the current position
- **Position persistence** — current index saves to localStorage on every navigation, restores on reload
- **Day header skipping** — PREV/NEXT skip the "SATURDAY APRIL 11" / "SUNDAY APRIL 12" divider entries

### Watch System (Dynamic Dancer Tracking)
- **Watch panel** — full-screen overlay with search input and alphabetical dancer list
- **Toggle watch** — tap a dancer to add/remove from watch list. Watched dancers float to top of panel with filled star ★, unwatched show outlined star ☆
- **Toast notifications** — "★ Watching Abigail Chretien" / "☆ Removed Abigail Chretien" on toggle
- **Gold highlighting** — entries containing watched dancers get gold border/background in the schedule list
- **Countdown banner** — fixed at bottom, shows "X dances until [TITLE]" with dance style, type, scheduled time, time estimate, and which watched dancers are in it. Shows "Up next →" when count is 0
- **Awards integration** — awards ceremonies where watched dancers have dances in the preceding block are treated as navigation targets in the countdown
- **Studio highlighting** — all entries sharing a studio with any watched dancer's dance get a subtle cyan left border
- **Watch list persistence** — stored in localStorage as JSON array of name strings

### Schedule Awareness
- **Behind/ahead indicator** — compares current wall clock to selected entry's scheduled time. Tiers: on schedule (±5min, green), slight delay (6-15min, gray), notable delay (16-30min, orange), stale selection (30+min, gray with "tap Now to sync" hint)
- **Day boundary handling** — when selected entry is on a different day than current time, shows "Sunday schedule" instead of a nonsensical time diff
- **Auto-refresh** — schedule indicator updates every 30 seconds via setInterval

### Navigation Aids
- **Jump to Now** — button scrolls (without selecting) to the entry closest to the current wall clock time, scoped to the correct day
- **Jump to Next** — countdown banner tap scrolls (without selecting) to the next watched-dancer entry
- **Snap-back pill** — floating button appears when you scroll away from the selected entry. Shows "↑ TITLE · TIME" or "↓ TITLE · TIME" depending on scroll direction. Dynamically positioned above the bottom bar. Uses IntersectionObserver for visibility detection
- **Progress bar** — 2px bar under the header showing position through total dances (excluding breaks)

### Display Options
- **Details toggle** — reveals studio, age, and dancer list for each entry. Dancers show 4 names with "+ X more" expand button. Watched dancers highlighted gold in the list
- **Font size** — three levels (default, medium, large) cycling via button. Stored in localStorage
- **Category separators** — section headers between groups showing "Competitive · Cosmic · Jazz · Solo" style labels

### Visual Design
- **Dark theme** — designed for a dark auditorium
- **Color system:**
  - Gold (#fbbf24) = watched dancers, their dances, relevant awards, countdown banner
  - Blue/indigo (#6366f1) = current selection, interactive elements, progress bar
  - Cyan left border = same studio as watched dancers
  - Gray = category headers, breaks, muted text
  - Green/orange/blue = schedule status tiers
- **Top bar icons** — SVG inline icons for font size (Aa), jump to now (clock), watch (star), details (info circle). Consistent stroke weight, no external dependencies
- **No double-tap zoom** — `touch-action: manipulation` on all elements

---

## Data Model

### Schedule Entry
```typescript
interface ScheduleEntry {
  num: number;          // Entry number (e.g., 452). 0 for breaks/headers
  time: string;         // "8:03 AM" format. Empty string for day headers
  studio: string;       // "A" through "G". Empty for breaks/headers
  category: string;     // "Competitive| Cosmic| Acro| Large Group" — pipe-delimited
  title: string;        // "FALLEN ANGEL"
  dancers: string[];    // Full names exactly as printed on schedule
  age: number;          // Age category. 0 for breaks
  isBreak?: boolean;    // true for awards, lunch, judges break, prop cleanup, day headers
  isDH?: boolean;       // true only for "SATURDAY APRIL 11" / "SUNDAY APRIL 12" headers
}
```

### Category String Format
The `category` field is pipe-delimited with 4 segments:
1. **Level**: Pre-Competitive, Competitive, Novice, Student Choreography
2. **Age group**: Star, Nova, Solar, Cosmic, Solaris, Prime
3. **Style**: Ballet, Jazz, Tap, Lyrical, Contemporary, Hip Hop, Acro, Open, Musical Theatre, Song & Dance, Modern
4. **Type**: Solo, Duet/Trio, Small Group, Large Group, Line, Extended Line, Production

### Awards Block
An awards block is defined as all entries between the previous AWARDS entry (or schedule start) and the current AWARDS entry. A block "has daughter dances" if any entry in it contains a watched dancer. These blocks are recomputed whenever the watch list changes.

---

## State Recommendations for Vue Store

### `scheduleStore`
Static data, loaded once:
```typescript
{
  entries: ScheduleEntry[];           // The full combined schedule (Sat header + Sat + Sun header + Sun)
  danceIndices: number[];             // Indices of non-break entries (for progress calculation)
  totalDances: number;                // danceIndices.length
  allDancers: string[];               // Sorted unique dancer names extracted from all entries
  awardsIndices: number[];            // Indices of AWARDS entries
  sundayStartIndex: number;           // Index of the Sunday day header
}
```
This store is **read-only after initialization**. It never changes during the session.

### `navigationStore`
The user's current position:
```typescript
{
  currentIndex: number;               // Currently selected entry index (persisted)
  showDetails: boolean;               // Details panel toggle (not persisted — resets each session is fine)
  fontSize: 'default' | 'medium' | 'large';  // Font size preference (persisted)
}
```
**Persist:** `currentIndex`, `fontSize`

### `watchStore`
The dynamic dancer tracking:
```typescript
{
  watchedDancers: string[];           // Names of watched dancers (persisted)

  // Computed (derived from watchedDancers + scheduleStore):
  watchedStudios: Set<string>;        // Studios where watched dancers perform
  awardsBlocks: AwardsBlock[];        // Recomputed when watchedDancers changes
  daughterAwardsSet: Set<number>;     // Indices of awards with watched dancers in block
}

interface AwardsBlock {
  awardsIndex: number;                // Index of the AWARDS entry
  blockStart: number;                 // First entry in the block
  hasDaughter: boolean;               // Whether any watched dancer is in this block
}
```
**Persist:** `watchedDancers` only. Everything else is derived.

### `uiStore`
Transient UI state:
```typescript
{
  watchPanelOpen: boolean;
  watchSearchQuery: string;
  toastMessage: string | null;
  toastTimer: number | null;
  snapbackVisible: boolean;
  snapbackDirection: 'up' | 'down';
  scheduleStatus: ScheduleStatus;
}

interface ScheduleStatus {
  type: 'on-schedule' | 'behind' | 'behind-notable' | 'stale' | 'ahead' | 'ahead-notable' | 'different-day';
  minutes?: number;
  dayLabel?: string;
}
```
**Persist:** nothing. All transient.

### Key Computed Properties (Getters)

These are the most important derivations and should be Vue computed properties or store getters:

```typescript
// Next target for countdown (next watched-dancer dance OR daughter-relevant awards)
nextTargetIndex: number | null;

// Count of non-break entries between current and next target
dancesUntilTarget: number | null;

// Time difference string between current entry and next target
timeUntilTarget: string | null;

// Whether current entry is a watched-dancer dance
currentIsWatched: boolean;

// Whether current entry is a daughter-relevant awards
currentIsDaughterAwards: boolean;

// Which watched dancers are in the current entry
currentWatchedDancers: string[];

// Which watched dancers are in the next target entry
nextTargetWatchedDancers: string[];

// Style + Type string for next target (e.g., "Acro · Large Group")
nextTargetStyleType: string;

// Dance number within total dances (for progress, excluding breaks)
currentDanceNumber: number | null;
```

---

## Lessons Learned (Save Yourself Pain)

### iOS Safari Copy-Paste Destroys JavaScript
The biggest time sink in this project. iOS converts straight quotes `"` to curly smart quotes `"` when copying through the clipboard — even with Smart Punctuation disabled in Settings. This silently breaks all JavaScript.

**The only reliable deployment path from iPhone was:**
1. Clone repo with git using a personal access token
2. Push the file directly from a server environment
3. Never paste code through iOS text input

For the Vue rebuild, use a proper CI/CD pipeline (GitHub Actions) or develop on desktop. Do not try to edit code on an iPhone.

### Zero External Dependencies Was the Right Call
The first version used React loaded from CDN (unpkg.com). It rendered perfectly inside Claude's artifact viewer but showed a **blank page** on GitHub Pages in iOS Safari. Babel's runtime JSX transpilation failed silently. Rebuilding as vanilla HTML/JS/CSS eliminated the issue completely.

For the Vue rebuild, use a build step (Vite) that produces a single bundled HTML or a small set of static files. Don't rely on runtime compilation in the browser.

### `const`/`let` Inside `try`/`catch` Caused Issues
The vanilla JS wraps everything in a `try/catch` for error reporting. Variables declared with `const`/`let` inside the `try` block are block-scoped and weren't accessible where needed. Using `var` (function-scoped) was the workaround. The Vue rebuild won't have this issue with proper module architecture.

### The Schedule Data Is Big
~350 entries with full dancer name arrays. The combined data is ~80KB of JavaScript. In the Vue rebuild, consider:
- Loading from a JSON file rather than embedding in the component
- Lazy rendering (virtualized list) for performance, though 350 items is manageable
- Precomputing derived data (dancer index, studio sets) at load time, not on every render

### `IntersectionObserver` for the Snap-back Pill
The pill visibility is driven by an IntersectionObserver watching the currently selected element. When the element scrolls out of view, the pill appears. The observer is disconnected and re-created each time the selection changes. A scroll event listener updates the arrow direction. This pattern works well and should be preserved.

### Awards Logic Is the Most Complex Part
The awards countdown is the trickiest feature because it bridges two concepts: "next dance my kid is in" and "next awards ceremony where my kid might win something." These are unified into a single `getNextTarget()` function that returns whichever comes first — a watched-dancer dance or a daughter-relevant awards entry. The Vue rebuild should have clear unit tests for this logic, especially edge cases:
- Last entry before awards
- First entry after awards
- Awards with no watched dancers in block (should be skipped)
- End of Saturday → start of Sunday transitions
- No watched dancers selected (everything should be inert)

### Scroll Position on Details Toggle
We tried multiple approaches to preserve scroll position when toggling details (which changes the height of every element): `getBoundingClientRect` measurement before/after, `offsetTop` deltas, `requestAnimationFrame` timing, and CSS `overflow-anchor`. **None of them worked reliably in iOS Safari.** The workaround is the snap-back pill — if toggling details scrolls you away, tap the pill to get back. The Vue rebuild could try `overflow-anchor: auto` on the scroll container, but don't spend too much time on this — the pill is a good enough solution.

### "Now" and "Jump to Next" Scroll Without Selecting
Early versions had these buttons change the selection (current index). Users found this confusing — they wanted to peek at what's coming without losing their place. Both actions now only call `scrollIntoView` and leave the selection alone.

---

## Component Decomposition Suggestion

```
App
├── TopBar
│   ├── FontSizeButton
│   ├── JumpToNowButton
│   ├── WatchButton (shows filled/unfilled state)
│   └── DetailsToggleButton
├── ScheduleStatus (behind/ahead indicator)
├── ProgressBar
├── ScheduleList
│   ├── DayHeader
│   ├── CategoryHeader
│   ├── BreakEntry (awards, lunch, judges break)
│   │   └── variant: DaughterAwardsEntry (gold styled)
│   └── DanceEntry
│       ├── DancerBadges (watched dancer names)
│       └── DanceDetails (studio, age, dancer list — collapsible)
│           └── DancerChip
├── SnapbackPill
├── BottomBar
│   ├── CountdownBanner (ON NOW / X dances until / Up next)
│   └── NavButtons (PREV / NEXT)
├── WatchPanel (full-screen overlay)
│   ├── WatchSearch
│   └── WatchDancerList
│       └── WatchDancerItem
└── Toast
```

---

## Test Coverage Priorities

High-value unit tests, ordered by impact:

1. **Awards block computation** — given a schedule and watch list, correctly identifies which awards blocks contain watched dancers
2. **Next target calculation** — returns the correct next watched-dance or daughter-awards index from any position
3. **Dance count between positions** — correctly counts non-break entries between two indices
4. **Time parsing and differencing** — handles AM/PM, noon, midnight edge cases
5. **Studio set computation** — given watch list, returns correct set of studios
6. **Schedule status classification** — given current time, entry time, and day, returns correct status tier
7. **Day boundary detection** — correctly identifies Saturday vs Sunday entries
8. **Watch list toggle** — add/remove works, deduplication, persistence
9. **Navigation bounds** — PREV at start, NEXT at end, day header skipping
10. **Jump to Now** — correct entry selection for Saturday AM, Saturday PM, Sunday AM, Sunday PM, non-competition day

---

## localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `dst` | `{ci: number}` | Current selection index |
| `dw` | `string[]` | Watched dancer names |
| `dfs` | `"0" \| "1" \| "2"` | Font size level index |

Consider namespacing these in the Vue rebuild (e.g., `destiny:navigation`, `destiny:watch`, `destiny:preferences`) to avoid collisions if the app is ever multi-competition.

---

## What's NOT Built Yet (Future Ideas Discussed)

- **Multi-competition support** — ability to load different schedule data (currently hardcoded)
- **Push notifications** — "Your daughter is 3 dances away" (would require service worker)
- **Share watch list** — QR code or link so both parents can track the same dancers
- **Results tracking** — recording awards/placements after each ceremony
- **Offline support** — service worker for full offline capability (currently works offline after first load since it's a single file, but a Vue build with separate assets would need a SW)
