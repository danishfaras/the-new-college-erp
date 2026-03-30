import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { patchCoverRequestSchema } from '@/lib/validations/coverage'
import { createAuditLog } from '@/lib/utils/audit'
import { emitNotification } from '@/lib/socket'

const coverInclude = {
  class: { select: { id: true, name: true, code: true } },
  fromStaff: { select: { id: true, name: true, email: true } },
  toStaff: { select: { id: true, name: true, email: true } },
  swapClass: { select: { id: true, name: true, code: true } },
} as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action } = patchCoverRequestSchema.parse(body)

    const row = await prisma.coverRequest.findUnique({
      where: { id },
      include: coverInclude,
    })

    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const uid = session.user.id
    const isAdmin = session.user.role === 'admin'
    const isOwnerTeacher = row.fromStaffId != null && row.fromStaffId === uid
    const isRequester = row.requestedById === uid

    if (action === 'cancel') {
      if (row.status === 'open' && row.kind === 'release') {
        if (!isAdmin && row.fromStaffId !== uid) {
          return NextResponse.json({ error: 'Only the staff who released can cancel.' }, { status: 403 })
        }
      } else if (row.status === 'pending') {
        const claimerCanCancel = row.toStaffId === uid
        if (!isAdmin && !isOwnerTeacher && !isRequester && !claimerCanCancel) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: 'This request cannot be cancelled.' }, { status: 400 })
      }
    }

    if (action === 'accept' || action === 'reject') {
      if (row.status !== 'pending') {
        return NextResponse.json({ error: 'This request is not pending.' }, { status: 400 })
      }
      if (!isOwnerTeacher && !isAdmin) {
        return NextResponse.json(
          { error: 'Only the assigned teacher (or admin) can accept or reject.' },
          { status: 403 }
        )
      }
      if (!row.toStaffId) {
        return NextResponse.json({ error: 'Invalid request state.' }, { status: 400 })
      }
    }

    let status: string
    if (action === 'accept') status = 'accepted'
    else if (action === 'reject') status = 'rejected'
    else status = 'cancelled'

    const updated = await prisma.coverRequest.update({
      where: { id },
      data: { status },
      include: coverInclude,
    })

    await createAuditLog(`COVER_REQUEST_${action.toUpperCase()}`, uid, id, {
      classId: row.classId,
      subject: row.subject,
      kind: row.kind,
    })

    if (action === 'accept' && row.kind === 'swap' && row.swapClassId && row.swapSubject) {
      const mirror = await prisma.coverRequest.create({
        data: {
          classId: row.swapClassId,
          date: row.date,
          day: row.swapDay || row.day,
          subject: row.swapSubject,
          startTime: row.swapStartTime || '',
          endTime: row.swapEndTime || '',
          fromStaffId: row.toStaffId,
          toStaffId: row.fromStaffId!,
          requestedById: uid,
          status: 'accepted',
          kind: 'cover',
          linkedRequestId: row.id,
        },
        include: coverInclude,
      })

      await createAuditLog('COVER_SWAP_MIRROR_CREATED', uid, mirror.id, {
        primaryId: row.id,
      })

      const swapClassName = row.swapClass?.name || 'class'
      if (row.toStaffId) {
        const n1 = await prisma.notification.create({
          data: {
            userId: row.toStaffId,
            title: 'Swap confirmed',
            message: `Swap accepted: you take ${row.class.name} (${row.subject}) and they take ${swapClassName} (${row.swapSubject}). You can take attendance for both roles as agreed.`,
            type: 'success',
            link: `/staff/classes/${row.classId}?action=take-attendance`,
          },
        })
        emitNotification(row.toStaffId, n1)
      }
      if (row.fromStaffId) {
        const n2 = await prisma.notification.create({
          data: {
            userId: row.fromStaffId,
            title: 'Swap confirmed',
            message: `Swap accepted: you take ${swapClassName} (${row.swapSubject}) and they cover ${row.class.name} (${row.subject}).`,
            type: 'success',
            link: `/staff/classes/${row.swapClassId}?action=take-attendance`,
          },
        })
        emitNotification(row.fromStaffId, n2)
      }
    } else if (action === 'accept') {
      if (row.toStaffId) {
        const n = await prisma.notification.create({
          data: {
            userId: row.toStaffId,
            title:
              row.kind === 'pickup' ? 'Pickup accepted' : 'Cover request accepted',
            message:
              row.kind === 'pickup'
                ? `Your pickup of ${row.subject} (${row.startTime}–${row.endTime}) for ${row.class.name} was accepted.`
                : `Your offer for ${row.subject} (${row.startTime}–${row.endTime}) for ${row.class.name} was accepted.`,
            type: 'success',
            link: `/staff/classes/${row.classId}?action=take-attendance`,
          },
        })
        emitNotification(row.toStaffId, n)
      }
    } else if (action === 'reject') {
      if (row.toStaffId) {
        const n = await prisma.notification.create({
          data: {
            userId: row.toStaffId,
            title: row.kind === 'pickup' ? 'Pickup declined' : 'Request declined',
            message: `Your ${row.kind === 'pickup' ? 'pickup' : 'offer'} for ${row.subject} (${row.class.name}) was declined.`,
            type: 'warning',
            link: '/staff/coverage',
          },
        })
        emitNotification(row.toStaffId, n)
      }
    }

    return NextResponse.json({ request: updated }, { status: 200 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('PATCH /api/coverage/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update cover request' }, { status: 500 })
  }
}
