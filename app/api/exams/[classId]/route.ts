import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const classId = params.classId
    const { searchParams } = new URL(request.url)
    const upcoming = searchParams.get('upcoming') === 'true'

    // Check if class exists
    const classData = await prisma.class.findUnique({
      where: { id: classId },
    })

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    const where: any = { classId }
    if (upcoming) {
      where.date = { gte: new Date() }
    }

    const exams = await prisma.exam.findMany({
      where,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({ exams }, { status: 200 })
  } catch (error) {
    console.error('Get exams error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exams' },
      { status: 500 }
    )
  }
}
