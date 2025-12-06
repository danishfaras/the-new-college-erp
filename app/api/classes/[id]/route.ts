import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { updateClassSchema } from '@/lib/validations/classes'
import { createAuditLog } from '@/lib/utils/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const classId = params.id

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        timetables: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        exams: {
          orderBy: { date: 'asc' },
        },
        _count: {
          select: {
            attendance: true,
          },
        },
      },
    })

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Staff can only view classes they're assigned to
    if (session.user.role === 'staff' && !classData.staffIds.includes(session.user.id)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Fetch staff details separately
    const staff = classData.staffIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: classData.staffIds } },
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                department: true,
                phone: true,
              },
            },
          },
        })
      : []

    return NextResponse.json({ class: { ...classData, staff } }, { status: 200 })
  } catch (error) {
    console.error('Get class error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch class' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const classId = params.id

    // Check if class exists and user has permission
    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
    })

    if (!existingClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Admin or assigned staff can update
    const canUpdate =
      session.user.role === 'admin' ||
      existingClass.staffIds.includes(session.user.id)

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permission to update this class.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateClassSchema.parse(body)

    const updateData: any = {}
    if (validatedData.name) updateData.name = validatedData.name
    if (validatedData.code) updateData.code = validatedData.code
    if (validatedData.department) updateData.department = validatedData.department
    if (validatedData.staffIds) updateData.staffIds = validatedData.staffIds

    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: updateData,
    })

    // Fetch staff details
    const staff = updatedClass.staffIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: updatedClass.staffIds } },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : []

    // Create audit log
    await createAuditLog('CLASS_UPDATED', session.user.id, classId, {
      changes: validatedData,
    })

    return NextResponse.json(
      {
        message: 'Class updated successfully',
        class: { ...updatedClass, staff },
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

    console.error('Update class error:', error)
    return NextResponse.json(
      { error: 'Failed to update class' },
      { status: 500 }
    )
  }
}
