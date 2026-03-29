import { prisma } from '@/lib/db/prisma'
import {
  type TimetableEntry,
  type SlotLike,
  normalizeDay,
  toAttendanceDay,
  normalizeAttendanceDate,
  orderSlotsForDay,
  entryMatchesSlot,
} from '@/lib/timetable-slot-utils'

export type { TimetableEntry, SlotLike }
export {
  normalizeDay,
  toAttendanceDay,
  normalizeAttendanceDate,
  orderSlotsForDay,
  entryMatchesSlot,
}

export async function hasAcceptedCover(
  userId: string,
  classId: string,
  attendanceDate: Date,
  slot: { day: string; subject: string; startTime: string; endTime: string }
) {
  const row = await prisma.coverRequest.findFirst({
    where: {
      classId,
      date: attendanceDate,
      day: slot.day,
      subject: slot.subject,
      startTime: slot.startTime,
      endTime: slot.endTime,
      toStaffId: userId,
      status: 'accepted',
    },
  })
  return !!row
}

/** Assigned in timetable or accepted substitute for this period. */
export async function teachesSlot(
  userId: string,
  classId: string,
  attendanceDate: Date,
  entry: TimetableEntry
) {
  if (entry.staffId && entry.staffId === userId) return true
  return hasAcceptedCover(userId, classId, attendanceDate, {
    day: entry.day || '',
    subject: entry.subject || '',
    startTime: entry.start || '',
    endTime: entry.end || '',
  })
}

export type EligibleSlot = SlotLike & { reason: 'assigned' | 'cover' | 'previous-of-next' }

function slotKey(s: SlotLike) {
  return `${s.day}|${s.subject}|${s.start}|${s.end}`
}

function entryToSlot(e: TimetableEntry, fallbackDay: string): SlotLike {
  return {
    subject: e.subject || 'Period',
    start: e.start || '',
    end: e.end || '',
    day: e.day || fallbackDay,
  }
}

export async function getEligibleSlotsForStaff(args: {
  classId: string
  dateStr: string
  userId: string
  entries: TimetableEntry[]
}): Promise<EligibleSlot[]> {
  const { classId, dateStr, userId, entries } = args
  const dayName = toAttendanceDay(dateStr)
  const attendanceDate = normalizeAttendanceDate(dateStr)
  const ordered = orderSlotsForDay(entries, dayName)
  const byKey = new Map<string, EligibleSlot>()

  const attendanceRows = await prisma.attendance.findMany({
    where: {
      classId,
      date: attendanceDate,
    },
    select: {
      subject: true,
      startTime: true,
      endTime: true,
    },
  })

  function hasAttendanceFor(slot: SlotLike) {
    return attendanceRows.some(
      (a) =>
        (a.subject || '') === slot.subject &&
        (a.startTime || '') === slot.start &&
        (a.endTime || '') === slot.end
    )
  }

  for (let i = 0; i < ordered.length; i++) {
    const e = ordered[i]
    const slot = entryToSlot(e, dayName)
    if (await teachesSlot(userId, classId, attendanceDate, e)) {
      const reason = e.staffId === userId ? 'assigned' : 'cover'
      byKey.set(slotKey(slot), { ...slot, reason })
    }
  }

  for (let i = 1; i < ordered.length; i++) {
    const nextEntry = ordered[i]
    const prevEntry = ordered[i - 1]
    const prevSlot = entryToSlot(prevEntry, dayName)
    if (hasAttendanceFor(prevSlot)) continue
    const teachesNext = await teachesSlot(userId, classId, attendanceDate, nextEntry)
    if (!teachesNext) continue
    if (!byKey.has(slotKey(prevSlot))) {
      byKey.set(slotKey(prevSlot), { ...prevSlot, reason: 'previous-of-next' })
    }
  }

  return Array.from(byKey.values()).sort((a, b) => a.start.localeCompare(b.start))
}

export async function staffMayRecordAttendance(args: {
  userId: string
  role: string
  classId: string
  dateStr: string
  slot: { subject: string; startTime: string; endTime: string; day: string }
  entries: TimetableEntry[]
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, role, classId, dateStr, slot, entries } = args
  if (role === 'admin') return { ok: true }

  const attendanceDate = normalizeAttendanceDate(dateStr)
  const dayName = toAttendanceDay(dateStr)
  const ordered = orderSlotsForDay(entries, dayName)

  const slotEntry = entries.find((e) => entryMatchesSlot(e, slot))
  if (!slotEntry) {
    return { ok: false, error: 'This period is not in the class timetable.' }
  }

  if (await teachesSlot(userId, classId, attendanceDate, slotEntry)) {
    return { ok: true }
  }

  const idx = ordered.findIndex(
    (e) =>
      (e.subject || '') === slot.subject &&
      (e.start || '') === slot.startTime &&
      (e.end || '') === slot.endTime
  )
  if (idx < 0) {
    return { ok: false, error: 'This period is not in the class timetable.' }
  }
  if (idx === ordered.length - 1) {
    return {
      ok: false,
      error: 'Only the assigned teacher (or accepted substitute) can take attendance for this period.',
    }
  }
  const nextEntry = ordered[idx + 1]
  const teachesNext = await teachesSlot(userId, classId, attendanceDate, nextEntry)
  if (!teachesNext) {
    return {
      ok: false,
      error:
        'You can only mark this period if you teach the very next period in this class (or have accepted cover for it), or if you are the assigned teacher / substitute for this period.',
    }
  }

  return { ok: true }
}
