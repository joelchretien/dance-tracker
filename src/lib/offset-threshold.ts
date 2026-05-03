/**
 * Schedule offset (anchor wall-time minus scheduled time, in minutes) below
 * this magnitude is treated as "on schedule" — predicted times aren't shown
 * on entries, the schedule-status pill reads "on schedule", and search rows
 * keep the scheduled time. Above this magnitude the offset is meaningful
 * enough to surface to the user as a predicted time.
 *
 * 5 minutes is roughly one dance, the natural unit of schedule drift in a
 * dance competition.
 */
export const OFFSET_DISPLAY_THRESHOLD_MIN = 5
