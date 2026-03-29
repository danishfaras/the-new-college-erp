import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

/** Staff on the same class (for display); cover requests are created by current user without picking a target. */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'staff' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const classId = new URL(request.url).searchParams.get('classId')
    if (!classId) {
      return NextResponse.json({ error: 'classId is required' }, { status: 400 })
    }

    const classData = await prisma.class.findUnique({ where: { id: classId } })
    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    if (session.user.role === 'staff' && !classData.staffIds.includes(session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const colleagues = await prisma.user.findMany({
      where: {
        id: { in: classData.staffIds },
        role: 'staff',
        approved: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        profile: { select: { department: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ colleagues }, { status: 200 })
  } catch (error) {
    console.error('GET /api/coverage/colleagues error:', error)
    return NextResponse.json({ error: 'Failed to load colleagues' }, { status: 500 })
  }
}
