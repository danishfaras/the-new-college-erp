import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { getEligibleSlotsForStaff } from '@/lib/attendance-eligibility'
import { orderSlotsForDay, toAttendanceDay, type TimetableEntry } from '@/lib/timetable-slot-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { classId } = await params
    const dateStr = new URL(request.url).searchParams.get('date')
    if (!dateStr) {
      return NextResponse.json({ error: 'date query is required (YYYY-MM-DD)' }, { status: 400 })
    }

    const classData = await prisma.class.findUnique({ where: { id: classId } })
    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    if (session.user.role === 'staff' && !classData.staffIds.includes(session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const timetable = await prisma.timetable.findFirst({
      where: { classId },
      orderBy: { updatedAt: 'desc' },
    })
    const entries = (timetable?.entries as TimetableEntry[]) || []
    const dayName = toAttendanceDay(dateStr)

    if (session.user.role === 'admin') {
      const ordered = orderSlotsForDay(entries, dayName)
      const slots = ordered.map((e) => ({
        subject: e.subject || 'Period',
        start: e.start || '',
        end: e.end || '',
        day: e.day || dayName,
        reason: 'admin' as const,
      }))
      return NextResponse.json({ slots }, { status: 200 })
    }

    const slots = await getEligibleSlotsForStaff({
      classId,
      dateStr,
      userId: session.user.id,
      entries,
    })

    return NextResponse.json({ slots }, { status: 200 })
  } catch (error) {
    console.error('eligible-slots error:', error)
    return NextResponse.json({ error: 'Failed to load eligible slots' }, { status: 500 })
  }
}
