# Convert Schedule PDF to JSON

You are converting a dance competition schedule PDF into the JSON format used by the Dance Tracker app.

## Input

A PDF file containing a multi-day dance competition schedule with entries like dances, awards ceremonies, breaks, and prop cleanup.

## Output

Two files:
1. `public/schedules/{id}.json` — the schedule data
2. Updated `public/schedules/index.json` — the manifest

## JSON Schema

```json
{
  "meta": {
    "id": "competition-name-2025",
    "name": "Competition Name"
  },
  "days": [
    {
      "date": "2025-06-15",
      "label": "SATURDAY JUNE 15",
      "entries": []
    }
  ]
}
```

### Entry Types

**Dance entry** — a competitive performance:
```json
{
  "type": "dance",
  "time": "8:03 AM",
  "title": "FALLEN ANGEL",
  "num": 452,
  "studio": "A",
  "category": "Competitive · Cosmic · Acro · Large Group",
  "dancers": ["First Last", "First Last"],
  "age": 12
}
```

**Awards entry** — an awards ceremony:
```json
{
  "type": "awards",
  "time": "10:00 AM",
  "title": "AWARDS #1"
}
```

**Break entry** — judges break, lunch, prop cleanup, etc.:
```json
{
  "type": "break",
  "time": "9:30 AM",
  "title": "JUDGES BREAK"
}
```

## Field Details

- `time`: Always in "H:MM AM/PM" or "HH:MM AM/PM" format (e.g., "8:03 AM", "12:30 PM")
- `title`: The dance name in UPPERCASE
- `num`: Entry number as printed on the schedule. Omit for breaks/awards.
- `studio`: Single letter (A-G typically). Omit for breaks/awards.
- `category`: Four segments joined with " · " — Level · Age Group · Style · Type. Examples:
  - Levels: Pre-Competitive, Competitive, Novice, Student Choreography
  - Age groups: Star, Nova, Solar, Cosmic, Solaris, Prime
  - Styles: Ballet, Jazz, Tap, Lyrical, Contemporary, Hip Hop, Acro, Open, Musical Theatre, Song & Dance, Modern
  - Types: Solo, Duet/Trio, Small Group, Large Group, Line, Extended Line, Production
- `dancers`: Array of full names exactly as printed. Include all dancers listed.
- `age`: Numeric age category. Omit for breaks/awards.
- `date`: ISO format YYYY-MM-DD
- `label`: Day header as shown to the user, e.g., "SATURDAY JUNE 15"

## Extraction Guidelines

1. **Identify days** — look for day headers (Saturday/Sunday, dates)
2. **Classify each entry** — dance, awards, or break based on content
3. **Awards** — any entry with "AWARDS" in the title
4. **Breaks** — judges break, lunch, prop cleanup, prop break, intermission
5. **Everything else** — dance entries with full metadata
6. **Dancer names** — extract complete lists, preserving exact spelling
7. **Categories** — normalize to the " · " separated format above
8. **Times** — normalize to "H:MM AM/PM" format
9. **Entry numbers** — numeric only, no leading zeros

## Manifest Update

Add an entry to `public/schedules/index.json`:
```json
{
  "schedules": [
    { "id": "competition-name-2025", "name": "Competition Name", "file": "competition-name-2025.json" }
  ]
}
```

## Validation

After generating, verify:
- Every dance entry has at minimum: type, time, title
- Times are parseable (match /^\d{1,2}:\d{2}\s*(AM|PM)$/i)
- Entry numbers are sequential within each day (with gaps for breaks)
- No duplicate entry numbers
- Dancer arrays are non-empty for dance entries
- Days are in chronological order
