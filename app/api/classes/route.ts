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
      _count: {
        select: {
          timetables: true,
          exams: true,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch staff details separately since MongoDB doesn't support many-to-many relations
    const classesWithStaff = await Promise.all(
      classes.map(async (cls) => {
        if (cls.staffIds.length > 0) {
          const staff = await prisma.user.findMany({
            where: { id: { in: cls.staffIds } },
            select: {
              id: true,
              name: true,
              email: true,
            },
          })
          return { ...cls, staff }
        }
        return { ...cls, staff: [] }
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
