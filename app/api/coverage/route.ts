import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { createCoverRequestSchema } from '@/lib/validations/coverage'
import { createAuditLog } from '@/lib/utils/audit'
import { emitNotification } from '@/lib/socket'
import {
  entryMatchesSlot,
  normalizeAttendanceDate,
  normalizeDay,
  toAttendanceDay,
} from '@/lib/timetable-slot-utils'

const coverInclude = {
  class: { select: { id: true, name: true, code: true } },
  fromStaff: { select: { id: true, name: true, email: true } },
  toStaff: { select: { id: true, name: true, email: true } },
  requestedBy: { select: { id: true, name: true, email: true } },
} as const

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const box = searchParams.get('box')
    const all = searchParams.get('all') === 'true'

    if (all) {
      if (session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const items = await prisma.coverRequest.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: coverInclude,
      })
      return NextResponse.json({ requests: items }, { status: 200 })
    }

    if (session.user.role !== 'staff' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const uid = session.user.id
    let where: any = {}

    if (box === 'inbox') {
      where = { fromStaffId: uid, status: 'pending' }
    } else if (box === 'outgoing') {
      where = { requestedById: uid, status: 'pending' }
    } else {
      where = {
        OR: [
          { fromStaffId: uid },
          { toStaffId: uid },
          { requestedById: uid },
        ],
      }
    }

    const requests = await prisma.coverRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 80,
      include: coverInclude,
    })

    return NextResponse.json({ requests }, { status: 200 })
  } catch (error) {
    console.error('GET /api/coverage error:', error)
    return NextResponse.json({ error: 'Failed to list cover requests' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'staff' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = createCoverRequestSchema.parse(body)
    const classData = await prisma.class.findUnique({ where: { id: data.classId } })
    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    if (session.user.role === 'staff' && !classData.staffIds.includes(session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const timetable = await prisma.timetable.findFirst({
      where: { classId: data.classId },
      orderBy: { updatedAt: 'desc' },
    })
    const entries = (timetable?.entries as any[]) || []
    if (normalizeDay(data.day) !== normalizeDay(toAttendanceDay(data.date))) {
      return NextResponse.json(
        { error: 'Weekday does not match the selected date.' },
        { status: 400 }
      )
    }
    const slotEntry = entries.find((e: any) =>
      entryMatchesSlot(e, {
        subject: data.subject,
        startTime: data.startTime,
        endTime: data.endTime,
        day: data.day,
      })
    )

    if (!slotEntry) {
      return NextResponse.json(
        { error: 'This period is not in the class timetable for that day.' },
        { status: 400 }
      )
    }

    const fromStaffId = slotEntry.staffId as string | undefined
    if (!fromStaffId) {
      return NextResponse.json(
        { error: 'This period has no assigned teacher in the timetable. Ask an admin to assign a teacher first.' },
        { status: 400 }
      )
    }

    const toStaffId = session.user.id
    if (fromStaffId === toStaffId) {
      return NextResponse.json(
        { error: 'You are already assigned to this period.' },
        { status: 400 }
      )
    }

    if (!classData.staffIds.includes(toStaffId)) {
      return NextResponse.json(
        { error: 'You must be on this class staff list to offer cover.' },
        { status: 403 }
      )
    }

    const attendanceDate = normalizeAttendanceDate(data.date)

    const dup = await prisma.coverRequest.findFirst({
      where: {
        classId: data.classId,
        date: attendanceDate,
        subject: data.subject,
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'pending',
      },
    })
    if (dup) {
      return NextResponse.json(
        { error: 'There is already a pending cover request for this period and date.' },
        { status: 400 }
      )
    }

    const acceptedOther = await prisma.coverRequest.findFirst({
      where: {
        classId: data.classId,
        date: attendanceDate,
        subject: data.subject,
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'accepted',
      },
    })
    if (acceptedOther) {
      return NextResponse.json(
        { error: 'Cover for this period on this date is already accepted.' },
        { status: 400 }
      )
    }

    const row = await prisma.coverRequest.create({
      data: {
        classId: data.classId,
        date: attendanceDate,
        day: data.day,
        subject: data.subject,
        startTime: data.startTime,
        endTime: data.endTime,
        fromStaffId,
        toStaffId,
        requestedById: toStaffId,
        status: 'pending',
      },
      include: coverInclude,
    })

    await createAuditLog('COVER_REQUEST_CREATED', session.user.id, row.id, {
      classId: data.classId,
      date: data.date,
      slot: `${data.subject} ${data.startTime}-${data.endTime}`,
    })

    const volunteerName = session.user.name || session.user.email || 'A colleague'
    const notif = await prisma.notification.create({
      data: {
        userId: fromStaffId,
        title: 'Class cover request',
        message: `${volunteerName} offered to cover ${data.subject} (${data.startTime}–${data.endTime}) for ${classData.name} on ${data.date}.`,
        type: 'info',
        link: '/staff/coverage?box=inbox',
      },
    })
    emitNotification(fromStaffId, notif)

    return NextResponse.json({ request: row }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('POST /api/coverage error:', error)
    return NextResponse.json({ error: 'Failed to create cover request' }, { status: 500 })
  }
}
