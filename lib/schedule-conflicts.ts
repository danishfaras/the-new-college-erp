import { prisma } from '@/lib/db/prisma'
import { normalizeDay, type TimetableEntry } from '@/lib/timetable-slot-utils'

/** "09:00" / "9:00" → minutes from midnight */
export function timeToMinutes(t: string): number {
  const s = (t || '').trim()
  const m = s.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return NaN
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10)
}

export function timeRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = timeToMinutes(aStart)
  const ae = timeToMinutes(aEnd)
  const bs = timeToMinutes(bStart)
  const be = timeToMinutes(bEnd)
  if ([as, ae, bs, be].some(Number.isNaN)) return false
  return as < be && bs < ae
}

export type StaffAssignment = {
  classId: string
  className: string
  classCode: string
  day: string
  subject: string
  start: string
  end: string
  staffId: string
}

export async function getStaffAssignmentsForDay(
  staffUserId: string,
  dayName: string
): Promise<StaffAssignment[]> {
  const classes = await prisma.class.findMany({
    where: { staffIds: { has: staffUserId } },
    select: { id: true, name: true, code: true },
  })
  const dn = normalizeDay(dayName)
  const out: StaffAssignment[] = []

  for (const cls of classes) {
    const tt = await prisma.timetable.findFirst({
      where: { classId: cls.id },
      orderBy: { updatedAt: 'desc' },
    })
    const entries = (tt?.entries as TimetableEntry[]) || []
    for (const e of entries) {
      if (normalizeDay(e.day || '') !== dn) continue
      const sid = String(e.staffId || '').trim()
      if (!sid || sid !== staffUserId) continue
      out.push({
        classId: cls.id,
        className: cls.name,
        classCode: cls.code,
        day: e.day || dayName,
        subject: e.subject || 'Period',
        start: e.start || '',
        end: e.end || '',
        staffId: sid,
      })
    }
  }
  return out
}

/** Slots this staff teaches that overlap the target window (same calendar day label). */
export function assignmentsOverlappingTarget(
  assignments: StaffAssignment[],
  target: { day: string; startTime: string; endTime: string }
): StaffAssignment[] {
  const d = normalizeDay(target.day)
  return assignments.filter(
    (a) =>
      normalizeDay(a.day) === d &&
      timeRangesOverlap(a.start, a.end, target.startTime, target.endTime)
  )
}
