import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { claimReleaseSchema } from '@/lib/validations/coverage'
import { createAuditLog } from '@/lib/utils/audit'
import { emitNotification } from '@/lib/socket'

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
    const { releaseId } = claimReleaseSchema.parse(body)
    const claimer = session.user.id

    const row = await prisma.coverRequest.findUnique({
      where: { id: releaseId },
      include: { class: true },
    })

    if (!row || row.kind !== 'release' || row.status !== 'open') {
      return NextResponse.json(
        { error: 'This release is not open for pickup.' },
        { status: 400 }
      )
    }

    if (row.fromStaffId === claimer) {
      return NextResponse.json(
        { error: 'You cannot claim your own released period.' },
        { status: 400 }
      )
    }

    if (!row.class.staffIds.includes(claimer)) {
      return NextResponse.json(
        { error: 'You must be on this class staff list to claim.' },
        { status: 403 }
      )
    }

    const updated = await prisma.coverRequest.update({
      where: { id: releaseId },
      data: {
        toStaffId: claimer,
        status: 'pending',
        kind: 'pickup',
      },
      include: coverInclude,
    })

    await createAuditLog('COVER_RELEASE_CLAIMED', claimer, releaseId, {
      classId: row.classId,
    })

    const claimerName = session.user.name || session.user.email || 'A colleague'
    if (row.fromStaffId) {
      const n = await prisma.notification.create({
        data: {
          userId: row.fromStaffId,
          title: 'Pickup request — please confirm',
          message: `${claimerName} wants to take your released ${row.subject} period (${row.startTime}–${row.endTime}) for ${row.class.name}. Open Cover → Inbox to accept or decline.`,
          type: 'info',
          link: '/staff/coverage?box=inbox',
        },
      })
      emitNotification(row.fromStaffId, n)
    }

    return NextResponse.json({ request: updated }, { status: 200 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('POST /api/coverage/claim error:', error)
    return NextResponse.json({ error: 'Failed to claim release' }, { status: 500 })
  }
}
