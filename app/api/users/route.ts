import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const approved = searchParams.get('approved')

    // Admin can see all users, staff can only see students
    if (session.user.role !== 'admin' && session.user.role !== 'staff') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin or staff access required.' },
        { status: 403 }
      )
    }

    const where: any = {}
    if (role) where.role = role
    if (approved !== null) where.approved = approved === 'true'

    // Staff can only see students
    if (session.user.role === 'staff') {
      where.role = 'student'
      where.approved = true
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approved: true,
        createdAt: true,
        profile: {
          select: {
            rollNo: true,
            department: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users }, { status: 200 })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
