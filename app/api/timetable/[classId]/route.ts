import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { updateTimetableSchema } from '@/lib/validations/timetable'
import { createAuditLog } from '@/lib/utils/audit'
import { emitTimetableUpdate } from '@/lib/socket'

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

    // Get latest timetable
    const timetable = await prisma.timetable.findFirst({
      where: { classId },
      orderBy: { updatedAt: 'desc' },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    return NextResponse.json(
      { timetable: timetable || { classId, entries: [] } },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get timetable error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timetable' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    // Check if class exists and user has permission
    const classData = await prisma.class.findUnique({
      where: { id: classId },
    })

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Admin or assigned staff can update timetable
    const canUpdate =
      session.user.role === 'admin' ||
      classData.staffIds.includes(session.user.id)

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permission to update this timetable.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateTimetableSchema.parse(body)

    // Find existing timetable or create new one
    let timetable = await prisma.timetable.findFirst({
      where: { classId },
      orderBy: { updatedAt: 'desc' },
    })

    if (timetable) {
      timetable = await prisma.timetable.update({
        where: { id: timetable.id },
        data: {
          entries: validatedData.entries as any,
          updatedBy: session.user.id,
        },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      })
    } else {
      timetable = await prisma.timetable.create({
        data: {
          classId,
          entries: validatedData.entries as any,
          updatedBy: session.user.id,
        },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      })
    }

    // Create audit log
    await createAuditLog('TIMETABLE_UPDATED', session.user.id, classId, {
      classCode: classData.code,
      entriesCount: validatedData.entries.length,
    })

    // Emit Socket.IO update
    emitTimetableUpdate(classId, timetable)

    return NextResponse.json(
      {
        message: 'Timetable updated successfully',
        timetable,
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

    console.error('Update timetable error:', error)
    return NextResponse.json(
      { error: 'Failed to update timetable' },
      { status: 500 }
    )
  }
}
