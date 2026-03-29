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

    if (row.status !== 'pending') {
      return NextResponse.json({ error: 'This request is no longer pending.' }, { status: 400 })
    }

    const uid = session.user.id
    const isAdmin = session.user.role === 'admin'
    const isOwnerTeacher = row.fromStaffId === uid
    const isRequester = row.requestedById === uid

    if (action === 'accept' || action === 'reject') {
      if (!isOwnerTeacher && !isAdmin) {
        return NextResponse.json(
          { error: 'Only the assigned teacher (or admin) can accept or reject.' },
          { status: 403 }
        )
      }
    }

    if (action === 'cancel') {
      if (!isRequester && !isOwnerTeacher && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    })

    if (action === 'accept') {
      const n = await prisma.notification.create({
        data: {
          userId: row.toStaffId,
          title: 'Cover request accepted',
          message: `Your offer to cover ${row.subject} (${row.startTime}–${row.endTime}) for ${row.class.name} was accepted. You can take attendance for that period.`,
          type: 'success',
          link: `/staff/classes/${row.classId}?action=take-attendance`,
        },
      })
      emitNotification(row.toStaffId, n)
    } else if (action === 'reject') {
      const n = await prisma.notification.create({
        data: {
          userId: row.toStaffId,
          title: 'Cover request declined',
          message: `Your offer to cover ${row.subject} for ${row.class.name} was declined.`,
          type: 'warning',
          link: '/staff/coverage',
        },
      })
      emitNotification(row.toStaffId, n)
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
