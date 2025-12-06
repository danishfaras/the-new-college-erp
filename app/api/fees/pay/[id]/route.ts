import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { createAuditLog } from '@/lib/utils/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: feeId } = await params

    // Find fee
    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
    })

    if (!fee) {
      return NextResponse.json(
        { error: 'Fee not found' },
        { status: 404 }
      )
    }

    // Students can only pay their own fees, admins/accounts can mark any as paid
    if (session.user.role === 'student' && fee.studentId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    if (fee.paid) {
      return NextResponse.json(
        { error: 'Fee is already paid' },
        { status: 400 }
      )
    }

    // Update fee as paid
    const updatedFee = await prisma.fee.update({
      where: { id: feeId },
      data: {
        paid: true,
        paidAt: new Date(),
      },
    })

    // Create audit log
    await createAuditLog('FEE_PAID', session.user.id, feeId, {
      studentId: fee.studentId,
      amount: fee.amount,
    })

    // TODO: In the future, integrate with payment gateway (Stripe/Razorpay)
    // For now, this is a placeholder that marks the fee as paid

    return NextResponse.json(
      {
        message: 'Payment processed successfully. Please note: This is a placeholder. In production, integrate with a payment gateway.',
        fee: updatedFee,
        paymentSession: null, // Will be populated when payment gateway is integrated
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Pay fee error:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
