import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { approveUserSchema } from '@/lib/validations/auth'
import { createAuditLog } from '@/lib/utils/audit'
import { sendEmail, getApprovalEmailTemplate } from '@/lib/utils/email'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId } = approveUserSchema.parse(body)

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.approved) {
      return NextResponse.json(
        { error: 'User is already approved' },
        { status: 400 }
      )
    }

    // Approve user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { approved: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approved: true,
      },
    })

    // Create audit log
    await createAuditLog('USER_APPROVED', session.user.id, userId, {
      email: user.email,
      role: user.role,
    })

    // Send approval email
    if (user.email && user.name) {
      const { subject, html } = getApprovalEmailTemplate(user.name)
      await sendEmail(user.email, subject, html)
    }

    return NextResponse.json(
      {
        message: 'User approved successfully',
        user: updatedUser,
      },
      { status: 200 }
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Approve user error:', error)
    return NextResponse.json(
      { error: 'Failed to approve user' },
      { status: 500 }
    )
  }
}
