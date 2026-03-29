export type TimetableEntry = {
  day?: string
  start?: string
  end?: string
  subject?: string
  staffId?: string
}

export type SlotLike = {
  subject: string
  start: string
  end: string
  day: string
}

export function normalizeDay(d: string) {
  return (d || '').trim().toLowerCase()
}

export function toAttendanceDay(dateStr: string): string {
  const ymd = dateStr.includes('T') ? dateStr.split('T')[0]! : dateStr
  const d = new Date(ymd + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long' })
}

export function normalizeAttendanceDate(dateStr: string): Date {
  const ymd = dateStr.includes('T') ? dateStr.split('T')[0]! : dateStr
  return new Date(ymd + 'T00:00:00.000Z')
}

export function orderSlotsForDay(entries: TimetableEntry[], dayName: string): TimetableEntry[] {
  const dn = normalizeDay(dayName)
  return (entries || [])
    .filter((e) => normalizeDay(e.day || '') === dn)
    .slice()
    .sort((a, b) => (a.start || '').localeCompare(b.start || ''))
}

export function entryMatchesSlot(
  e: TimetableEntry,
  slot: { subject: string; startTime: string; endTime: string; day: string }
) {
  return (
    normalizeDay(e.day || '') === normalizeDay(slot.day) &&
    (e.subject || '') === slot.subject &&
    (e.start || '') === slot.startTime &&
    (e.end || '') === slot.endTime
  )
}
