import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { releasePeriodSchema } from '@/lib/validations/coverage'
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
  swapClass: { select: { id: true, name: true, code: true } },
} as const

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
    const data = releasePeriodSchema.parse(body)

    const classData = await prisma.class.findUnique({ where: { id: data.classId } })
    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    const uid = session.user.id
    if (session.user.role === 'staff' && !classData.staffIds.includes(uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (normalizeDay(data.day) !== normalizeDay(toAttendanceDay(data.date))) {
      return NextResponse.json(
        { error: 'Weekday does not match the selected date.' },
        { status: 400 }
      )
    }

    const timetable = await prisma.timetable.findFirst({
      where: { classId: data.classId },
      orderBy: { updatedAt: 'desc' },
    })
    const entries = (timetable?.entries as any[]) || []
    const slotEntry = entries.find((e: any) =>
      entryMatchesSlot(e, {
        subject: data.subject,
        startTime: data.startTime,
        endTime: data.endTime,
        day: data.day,
      })
    )
    if (!slotEntry) {
      return NextResponse.json({ error: 'Period not in timetable.' }, { status: 400 })
    }

    const owner = String(slotEntry.staffId ?? '').trim()
    if (!owner) {
      return NextResponse.json(
        { error: 'This period has no assigned teacher — use “Take open period” instead of release.' },
        { status: 400 }
      )
    }
    if (session.user.role === 'staff' && owner !== uid) {
      return NextResponse.json(
        { error: 'You can only release periods assigned to you in the timetable.' },
        { status: 403 }
      )
    }

    const attendanceDate = normalizeAttendanceDate(data.date)

    const clash = await prisma.coverRequest.findFirst({
      where: {
        classId: data.classId,
        date: attendanceDate,
        subject: data.subject,
        startTime: data.startTime,
        endTime: data.endTime,
        status: { in: ['pending', 'open', 'accepted'] },
      },
    })
    if (clash) {
      return NextResponse.json(
        { error: 'There is already a request or assignment for this period on this date.' },
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
        fromStaffId: owner,
        toStaffId: null,
        requestedById: uid,
        status: 'open',
        kind: 'release',
      },
      include: coverInclude,
    })

    await createAuditLog('COVER_PERIOD_RELEASED', uid, row.id, { classId: data.classId })

    const name = session.user.name || session.user.email || 'A colleague'
    for (const userId of classData.staffIds) {
      if (userId === uid) continue
      const n = await prisma.notification.create({
        data: {
          userId,
          title: 'Period released for pickup',
          message: `${name} released ${data.subject} (${data.startTime}–${data.endTime}) for ${classData.name} on ${data.date}. Claim it under Cover → Class (all pending).`,
          type: 'warning',
          link: '/staff/coverage?box=class',
        },
      })
      emitNotification(userId, n)
    }

    return NextResponse.json({ request: row }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('POST /api/coverage/release error:', error)
    return NextResponse.json({ error: 'Failed to release period' }, { status: 500 })
  }
}
