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
import {
  assignmentsOverlappingTarget,
  getStaffAssignmentsForDay,
  timeRangesOverlap,
} from '@/lib/schedule-conflicts'

const coverInclude = {
  class: { select: { id: true, name: true, code: true } },
  fromStaff: { select: { id: true, name: true, email: true } },
  toStaff: { select: { id: true, name: true, email: true } },
  requestedBy: { select: { id: true, name: true, email: true } },
  swapClass: { select: { id: true, name: true, code: true } },
} as const

async function notifyClassStaffAboutCover(args: {
  classData: { id: string; name: string; staffIds: string[] }
  toStaffId: string
  fromStaffId: string | null
  assigneeMessage: () => { title: string; message: string; link: string }
  colleagueMessage: () => { title: string; message: string; link: string }
}) {
  const { classData, toStaffId, fromStaffId, assigneeMessage, colleagueMessage } = args
  for (const userId of classData.staffIds) {
    if (userId === toStaffId) continue
    const isAssignee = fromStaffId != null && userId === fromStaffId
    const payload = isAssignee ? assigneeMessage() : colleagueMessage()
    const notif = await prisma.notification.create({
      data: {
        userId,
        title: payload.title,
        message: payload.message,
        type: 'info',
        link: payload.link,
      },
    })
    emitNotification(userId, notif)
  }
}

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
        where: { status: { in: ['pending', 'open'] } },
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
      where = {
        OR: [
          { requestedById: uid, status: 'pending' },
          { fromStaffId: uid, status: 'open', kind: 'release' },
        ],
      }
    } else if (box === 'class') {
      const myClasses = await prisma.class.findMany({
        where: { staffIds: { has: uid } },
        select: { id: true },
      })
      const classIds = myClasses.map((c) => c.id)
      if (classIds.length === 0) {
        return NextResponse.json({ requests: [] }, { status: 200 })
      }
      where = {
        OR: [
          { status: 'pending', classId: { in: classIds } },
          { status: 'open', kind: 'release', classId: { in: classIds } },
        ],
      }
    } else if (box === 'all') {
      where = {
        OR: [
          { fromStaffId: uid },
          { toStaffId: uid },
          { requestedById: uid },
        ],
      }
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

    const toStaffId = session.user.id
    const attendanceDate = normalizeAttendanceDate(data.date)
    const dayLabel = toAttendanceDay(data.date)

    const rawStaff = String(slotEntry.staffId ?? '')
      .trim()
      .replace(/\s/g, '')
    const isEmptySlot = !rawStaff

    const dupPending = await prisma.coverRequest.findFirst({
      where: {
        classId: data.classId,
        date: attendanceDate,
        subject: data.subject,
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'pending',
      },
    })
    if (dupPending) {
      return NextResponse.json(
        { error: 'There is already a pending request for this period and date.' },
        { status: 400 }
      )
    }

    const dupOpen = await prisma.coverRequest.findFirst({
      where: {
        classId: data.classId,
        date: attendanceDate,
        subject: data.subject,
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'open',
        kind: 'release',
      },
    })
    if (dupOpen) {
      return NextResponse.json(
        { error: 'This period is already released for pickup. Claim it from Class pending.' },
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
        { error: 'Someone is already assigned for this period on this date.' },
        { status: 400 }
      )
    }

    // —— Empty slot: auto-accept ——
    if (isEmptySlot) {
      const row = await prisma.coverRequest.create({
        data: {
          classId: data.classId,
          date: attendanceDate,
          day: data.day,
          subject: data.subject,
          startTime: data.startTime,
          endTime: data.endTime,
          fromStaffId: null,
          toStaffId,
          requestedById: toStaffId,
          status: 'accepted',
          kind: 'cover',
          autoApproved: true,
        },
        include: coverInclude,
      })

      await createAuditLog('COVER_AUTO_APPROVED_EMPTY_SLOT', session.user.id, row.id, {
        classId: data.classId,
        date: data.date,
      })

      const selfNotif = await prisma.notification.create({
        data: {
          userId: toStaffId,
          title: 'Open period assigned to you',
          message: `You are approved to take ${data.subject} (${data.startTime}–${data.endTime}) for ${classData.name} on ${data.date} (no teacher was on the timetable for this slot).`,
          type: 'success',
          link: `/staff/classes/${data.classId}?action=take-attendance`,
        },
      })
      emitNotification(toStaffId, selfNotif)

      for (const userId of classData.staffIds) {
        if (userId === toStaffId) continue
        const n = await prisma.notification.create({
          data: {
            userId,
            title: 'Open period filled',
            message: `${session.user.name || session.user.email} took the open ${data.subject} slot (${data.startTime}–${data.endTime}) for ${classData.name} on ${data.date}.`,
            type: 'info',
            link: '/staff/coverage?box=class',
          },
        })
        emitNotification(userId, n)
      }

      return NextResponse.json({ request: row, autoApproved: true }, { status: 201 })
    }

    // —— Assigned slot: cover or swap ——
    const fromStaffId = rawStaff

    if (!classData.staffIds.includes(fromStaffId)) {
      return NextResponse.json(
        {
          error:
            'The teacher on this timetable slot is not on this class staff list. Add them under Admin → Classes.',
        },
        { status: 400 }
      )
    }

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

    const myAssignments = await getStaffAssignmentsForDay(toStaffId, dayLabel)
    const conflicts = assignmentsOverlappingTarget(myAssignments, {
      day: data.day,
      startTime: data.startTime,
      endTime: data.endTime,
    })

    const isSwap = data.kind === 'swap'

    if (conflicts.length > 0 && !isSwap) {
      return NextResponse.json(
        {
          code: 'SCHEDULE_CONFLICT',
          message:
            'You already teach another class in this time window. Propose a parallel swap: you take this period and the other teacher takes one of your same-time periods.',
          conflicts: conflicts.map((c) => ({
            classId: c.classId,
            className: c.className,
            classCode: c.classCode,
            subject: c.subject,
            start: c.start,
            end: c.end,
            day: c.day,
          })),
        },
        { status: 409 }
      )
    }

    if (isSwap) {
      if (!data.swapOffer) {
        return NextResponse.json(
          { error: 'Swap requires swapOffer (your period at the same time to trade).' },
          { status: 400 }
        )
      }
      const so = data.swapOffer
      if (normalizeDay(so.day) !== normalizeDay(data.day)) {
        return NextResponse.json(
          { error: 'Swap offer must be on the same weekday as the period you want to cover.' },
          { status: 400 }
        )
      }
      if (
        !timeRangesOverlap(data.startTime, data.endTime, so.startTime, so.endTime)
      ) {
        return NextResponse.json(
          {
            error:
              'Swap periods must overlap in time (same teaching window) so you exchange parallel classes.',
          },
          { status: 400 }
        )
      }

      const swapClass = await prisma.class.findUnique({ where: { id: so.classId } })
      if (!swapClass) {
        return NextResponse.json({ error: 'Swap class not found' }, { status: 404 })
      }
      if (!swapClass.staffIds.includes(toStaffId)) {
        return NextResponse.json(
          { error: 'You must be on the swap class staff list.' },
          { status: 403 }
        )
      }
      if (!swapClass.staffIds.includes(fromStaffId)) {
        return NextResponse.json(
          {
            error:
              'The other teacher must be on the swap class staff list to take your period after the swap. Add them in Admin → Classes.',
          },
          { status: 400 }
        )
      }

      const swapTt = await prisma.timetable.findFirst({
        where: { classId: so.classId },
        orderBy: { updatedAt: 'desc' },
      })
      const swapEntries = (swapTt?.entries as any[]) || []
      const swapEntry = swapEntries.find((e: any) =>
        entryMatchesSlot(e, {
          subject: so.subject,
          startTime: so.startTime,
          endTime: so.endTime,
          day: so.day,
        })
      )
      if (!swapEntry) {
        return NextResponse.json(
          { error: 'Your swap offer period is not in that class timetable.' },
          { status: 400 }
        )
      }
      const swapOwner = String(swapEntry.staffId ?? '').trim()
      if (swapOwner !== toStaffId) {
        return NextResponse.json(
          { error: 'You are not the assigned teacher for the swap offer period.' },
          { status: 403 }
        )
      }

      const swapOverlaps = assignmentsOverlappingTarget(myAssignments, {
        day: so.day,
        startTime: so.startTime,
        endTime: so.endTime,
      })
      const okSwap = swapOverlaps.some(
        (a) =>
          a.classId === so.classId &&
          a.subject === so.subject &&
          a.start === so.startTime &&
          a.end === so.endTime
      )
      if (!okSwap) {
        return NextResponse.json(
          { error: 'Swap offer must be one of your periods that overlaps this time window.' },
          { status: 400 }
        )
      }
    } else if (conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Unexpected conflict state. Use kind swap with swapOffer.' },
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
        kind: isSwap ? 'swap' : 'cover',
        swapClassId: isSwap ? data.swapOffer!.classId : null,
        swapSubject: isSwap ? data.swapOffer!.subject : null,
        swapStartTime: isSwap ? data.swapOffer!.startTime : null,
        swapEndTime: isSwap ? data.swapOffer!.endTime : null,
        swapDay: isSwap ? data.swapOffer!.day : null,
      },
      include: coverInclude,
    })

    await createAuditLog('COVER_REQUEST_CREATED', session.user.id, row.id, {
      classId: data.classId,
      kind: row.kind,
      date: data.date,
    })

    const volunteerName = session.user.name || session.user.email || 'A colleague'
    const teacherName =
      row.fromStaff?.name || row.fromStaff?.email || 'the assigned teacher'
    const swapHint = isSwap
      ? ` (parallel swap: they offer ${data.swapOffer!.subject} in ${row.swapClass?.name || 'another class'})`
      : ''

    await notifyClassStaffAboutCover({
      classData,
      toStaffId,
      fromStaffId,
      assigneeMessage: () => ({
        title: isSwap ? 'Swap request — please respond' : 'Cover request — please respond',
        message: isSwap
          ? `${volunteerName} proposed a swap for your ${data.subject} period (${data.startTime}–${data.endTime}) on ${data.date}: they take your class and you take their ${data.swapOffer!.subject} slot${swapHint}. Open Cover → Inbox.`
          : `${volunteerName} offered to cover your ${data.subject} period (${data.startTime}–${data.endTime}) for ${classData.name} on ${data.date}. Open Cover → Inbox.`,
        link: '/staff/coverage?box=inbox',
      }),
      colleagueMessage: () => ({
        title: isSwap ? 'Class swap proposed' : 'Class cover request',
        message: isSwap
          ? `${volunteerName} proposed a swap with ${teacherName} for ${data.subject} on ${data.date}.${swapHint}`
          : `${volunteerName} offered to cover ${teacherName}'s ${data.subject} period (${data.startTime}–${data.endTime}) for ${classData.name} on ${data.date}.`,
        link: '/staff/coverage?box=class',
      }),
    })

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
