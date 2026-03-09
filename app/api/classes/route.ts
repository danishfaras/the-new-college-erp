import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { createClassSchema } from '@/lib/validations/classes'
import { createAuditLog } from '@/lib/utils/audit'

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
    const department = searchParams.get('department')

    const where: any = {}
    if (department) where.department = department

    // Staff can only see classes they're assigned to
    if (session.user.role === 'staff') {
      where.staffIds = { has: session.user.id }
    }

    const classes = await prisma.class.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Fetch staff details and counts separately since MongoDB doesn't support _count with select
    const classesWithStaff = await Promise.all(
      classes.map(async (cls) => {
        // Fetch staff
        const staff = cls.staffIds.length > 0
          ? await prisma.user.findMany({
              where: { id: { in: cls.staffIds } },
              select: {
                id: true,
                name: true,
                email: true,
              },
            })
          : []

        // Manually count related records
        const [timetableCount, examCount, attendanceCount] = await Promise.all([
          prisma.timetable.count({ where: { classId: cls.id } }),
          prisma.exam.count({ where: { classId: cls.id } }),
          prisma.attendance.count({ where: { classId: cls.id } }),
        ])

        return {
          ...cls,
          staff,
          _count: {
            timetables: timetableCount,
            exams: examCount,
            attendance: attendanceCount,
          },
        }
      })
    )

    return NextResponse.json({ classes: classesWithStaff }, { status: 200 })
  } catch (error) {
    console.error('Get classes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    )
  }
}

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
    const validatedData = createClassSchema.parse(body)

    // Check if class code already exists
    const existingClass = await prisma.class.findUnique({
      where: { code: validatedData.code },
    })

    if (existingClass) {
      return NextResponse.json(
        { error: 'Class with this code already exists' },
        { status: 400 }
      )
    }

    const newClass = await prisma.class.create({
      data: {
        name: validatedData.name,
        code: validatedData.code,
        department: validatedData.department,
        staffIds: validatedData.staffIds || [],
        studentIds: validatedData.studentIds || [],
      },
    })

    // Fetch staff details
    const staff = newClass.staffIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: newClass.staffIds } },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : []

    // Create audit log
    await createAuditLog('CLASS_CREATED', session.user.id, newClass.id, {
      name: newClass.name,
      code: newClass.code,
      department: newClass.department,
    })

    return NextResponse.json(
      {
        message: 'Class created successfully',
        class: { ...newClass, staff },
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create class error:', error)
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    )
  }
}
