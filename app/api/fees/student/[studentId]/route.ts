import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { studentId } = await params

    // Students can only view their own fees, admins can view any
    if (session.user.role !== 'admin' && session.user.id !== studentId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const fees = await prisma.fee.findMany({
      where: { studentId },
      orderBy: { dueDate: 'asc' },
    })

    const total = fees.reduce((sum: number, fee: any) => sum + fee.amount, 0)
    const paid = fees.filter((f: any) => f.paid).reduce((sum: number, fee: any) => sum + fee.amount, 0)
    const pending = total - paid

    return NextResponse.json({
      fees,
      summary: {
        total,
        paid,
        pending,
      },
    })
  } catch (error) {
    console.error('Get fees error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fees' },
      { status: 500 }
    )
  }
}
