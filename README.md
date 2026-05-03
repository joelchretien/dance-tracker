# Dance Tracker

A mobile-first web app for tracking dancers through multi-day dance competition schedules. Built for parents sitting in a dark auditorium who need to know when their kids are up next.

**Live:** https://joelchretien.github.io/dance-tracker/

## Features

- **Schedule tracking** — advance through 350+ entries, see what's current, what's next
- **Watched Dancers** — star specific dancers, see their entries highlighted in gold with countdown banners
- **Watched Dances mode** — filtered view showing only watched dancers' entries with time gaps between them
- **Search** — fuzzy search by dance title, entry number, or awards name
- **Schedule status** — shows if the competition is running ahead/behind based on wall clock time
- **Jump to now** — floating pill scrolls to the entry closest to current time
- **Awards tracking** — awards with watched dancers highlighted, searchable
- **Dark theme** — designed for low-light auditoriums
- **Protan color-blind safe** — uses shape, pattern, and luminance (not just hue) to distinguish states
- **Offline support** — service worker caches assets, works without signal
- **Auto-update** — service worker checks for new versions every 60 seconds

## Architecture

```
src/
├── lib/           Pure functions (tested)
│   ├── auto-advance.ts     findLikelyCurrentIndex (anchor + offset → likely now)
│   ├── awards.ts           Awards block computation
│   ├── category.ts         Category string formatting
│   ├── countdown.ts        Next target + dance counting
│   ├── entry-duration.ts   Per-entry duration from neighbour times
│   ├── fuzzy-search.ts     Fuzzy search scoring
│   ├── navigation.ts       Jump-to-now + day index
│   ├── normalize-persisted.ts  Sanitize/clamp localStorage values at hydration
│   ├── offset-threshold.ts Single source of truth for the meaningful-offset min
│   ├── predicted-time.ts   Apply schedule offset to a scheduled time
│   ├── schedule-status.ts  Behind/ahead classification
│   ├── search-enrich.ts    JumpToPanel result enrichment (pure)
│   ├── time.ts             Time parsing + formatting
│   ├── title-case.ts       Dance title formatting
│   └── validate-schedule.ts  JSON schema validator at load boundary
├── stores/        Pinia stores (state + derived data)
│   ├── schedule.ts       Static schedule data (read-only after load)
│   ├── navigation.ts     Position, selection, font size
│   ├── watch.ts          Watched dancers + derived sets
│   └── ui.ts             Panel states, toasts, transient UI
├── components/    Vue SFCs
│   ├── DanceEntry.vue    Individual dance row
│   ├── BreakEntry.vue    Awards/break row
│   ├── ScheduleList.vue  Full schedule rendering
│   ├── WatchedDancesList.vue  Filtered watched-only view
│   ├── CountdownBanner.vue  Next watched dance countdown
│   ├── JumpToPanel.vue   Search + jump-to overlay
│   ├── SettingsDropdown.vue  Font size + watch dancers
│   └── ...
├── composables/   Reusable behavior
│   ├── useFocusTrap.ts   Tab containment + restore-focus for dialogs
│   ├── useSeekableBar.ts Drag/click/keyboard seek + ARIA slider props
│   └── useSnapback.ts    Jump-to-now pill visibility
└── views/         Route-level components
    ├── HomeView.vue      Schedule selector (auto-redirects with single schedule)
    └── TrackerView.vue   Main tracker screen
```

## Key Concepts

**Marked vs Selected:** Two independent selection states. *Marked* is the current dance (what Back/Advance operates on, persisted). *Selected* is the dance you tapped to inspect (shows details, transient). They have distinct visual treatments for color-blind accessibility.

**Schedule data:** JSON files in `public/schedules/`. Each has a `meta` object and a `days` array containing typed entries (`dance`, `break`, `awards`).

**Persistence:** `markedIndex`, `watchedDancers`, and `fontSize` persist to localStorage, namespaced by schedule ID.

## Adding a New Competition

1. Upload the competition's schedule PDF to Claude and use the skill in `skills/convert-schedule.md`
2. Claude will generate the schedule JSON and update the manifest
3. Place the JSON in `public/schedules/` and update `public/schedules/index.json`
4. Push to main — GitHub Actions deploys automatically

### Schedule JSON Format

```json
{
  "meta": { "id": "my-competition", "name": "My Competition" },
  "days": [
    {
      "date": "2025-06-15",
      "label": "SATURDAY JUNE 15",
      "entries": [
        { "type": "dance", "time": "8:00 AM", "title": "OPENING NUMBER", "num": 1, "studio": "A", "category": "Competitive · Nova · Jazz · Solo", "dancers": ["Jane Doe"], "age": 10 },
        { "type": "break", "time": "9:30 AM", "title": "JUDGES BREAK" },
        { "type": "awards", "time": "10:00 AM", "title": "AWARDS #1" }
      ]
    }
  ]
}
```

The schedule JSON format is fully documented in `skills/convert-schedule.md`.

## Development

```bash
npm install
npm run dev      # Vite dev server
npm test         # Run tests (189 tests, 16 files)
npm run build    # Type-check + production build
```

## Deployment

Push to `main` triggers GitHub Actions which builds and deploys to GitHub Pages. The service worker handles cache busting — the home-screen app picks up new versions within 60 seconds.

Build SHA is visible in Settings dropdown for version verification.

## Tech Stack

Vue 3, Pinia, TypeScript, Tailwind CSS v4, Vite 6, Vitest, GitHub Pages
