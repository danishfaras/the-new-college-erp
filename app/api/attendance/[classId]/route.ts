import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { createAttendanceSchema } from '@/lib/validations/attendance'
import { createAuditLog } from '@/lib/utils/audit'
import { emitAttendanceUpdate } from '@/lib/socket'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { classId } = await params
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

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
    if (start && end) {
      where.date = {
        gte: new Date(start),
        lte: new Date(end),
      }
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        takenByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    // If student, calculate attendance percentage
    if (session.user.role === 'student') {
      const studentRecords = attendance.flatMap((a) => {
        const records = a.records as any[]
        return records
          .filter((r: any) => r.studentId === session.user.id)
          .map((r: any) => ({
            date: a.date,
            status: r.status,
          }))
      })

      const total = studentRecords.length
      const present = studentRecords.filter((r: any) => r.status === 'present' || r.status === 'late').length
      const percentage = total > 0 ? (present / total) * 100 : 0

      return NextResponse.json({
        attendance,
        summary: {
          total,
          present,
          absent: total - present,
          percentage: Math.round(percentage * 100) / 100,
        },
      })
    }

    return NextResponse.json({ attendance }, { status: 200 })
  } catch (error) {
    console.error('Get attendance error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only staff can take attendance
    if (session.user.role !== 'staff' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden. Staff access required.' },
        { status: 403 }
      )
    }

    const { classId } = await params

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

    // Staff can only take attendance for classes they're assigned to
    if (session.user.role === 'staff' && !classData.staffIds.includes(session.user.id)) {
      return NextResponse.json(
        { error: 'Forbidden. You can only take attendance for classes you teach.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createAttendanceSchema.parse(body)

    // Normalize date to start of day (UTC) so YYYY-MM-DD or ISO both work
    const dateStr = validatedData.date
    const attendanceDate = dateStr.includes('T')
      ? new Date(dateStr)
      : new Date(dateStr + 'T00:00:00.000Z')

    // Check if attendance already exists for this date
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        classId,
        date: attendanceDate,
      },
    })

    if (existingAttendance) {
      return NextResponse.json(
        { error: 'Attendance for this date already exists' },
        { status: 400 }
      )
    }

    const attendance = await prisma.attendance.create({
      data: {
        classId,
        date: attendanceDate,
        records: validatedData.records as any,
        takenBy: session.user.id,
      },
      include: {
        takenByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Create audit log
    await createAuditLog('ATTENDANCE_CREATED', session.user.id, classId, {
      classCode: classData.code,
      date: attendance.date,
      recordsCount: validatedData.records.length,
    })

    // Emit Socket.IO update
    emitAttendanceUpdate(classId, attendance)

    return NextResponse.json(
      {
        message: 'Attendance recorded successfully',
        attendance,
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

    console.error('Create attendance error:', error)
    return NextResponse.json(
      { error: 'Failed to record attendance' },
      { status: 500 }
    )
  }
}
