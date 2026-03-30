import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { getStaffAssignmentsForDay } from '@/lib/schedule-conflicts'
import { toAttendanceDay } from '@/lib/timetable-slot-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'staff' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const dateStr = new URL(request.url).searchParams.get('date')
    if (!dateStr) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    const dayName = toAttendanceDay(dateStr)
    const assignments = await getStaffAssignmentsForDay(session.user.id, dayName)

    return NextResponse.json({ day: dayName, assignments }, { status: 200 })
  } catch (error) {
    console.error('GET /api/coverage/conflicts error:', error)
    return NextResponse.json({ error: 'Failed to load schedule' }, { status: 500 })
  }
}
