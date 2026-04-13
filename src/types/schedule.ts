// -- JSON file types --
export interface ScheduleManifest {
  schedules: ScheduleManifestEntry[]
}
export interface ScheduleManifestEntry {
  id: string
  name: string
}

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
  num?: number
  studio?: string
  category?: string
  dancers?: string[]
  age?: number
}
export interface BreakEntry { type: 'break'; time: string; title: string }
export interface AwardsEntry { type: 'awards'; time: string; title: string }

// -- Internal indexed types (derived at load time) --
export interface IndexedEntry {
  entry: ScheduleEntry
  dayIndex: number
  globalIndex: number
}

export interface AwardsBlock {
  awardsGlobalIndex: number
  blockStartIndex: number
  hasWatchedDancer: boolean
}

export type ScheduleStatus =
  | { kind: 'on-schedule' }
  | { kind: 'behind'; minutes: number }
  | { kind: 'ahead'; minutes: number }
  | { kind: 'way-behind'; minutes: number }
  | { kind: 'not-started' }
  | { kind: 'wrong-day'; dayLabel: string }

export type FontSize = 'default' | 'medium' | 'large'
