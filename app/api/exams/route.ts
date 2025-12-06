import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { createExamSchema } from '@/lib/validations/exams'
import { createAuditLog } from '@/lib/utils/audit'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Admin or staff can create exams
    if (session.user.role !== 'admin' && session.user.role !== 'staff') {
      return NextResponse.json(
        { error: 'Forbidden. Admin or staff access required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createExamSchema.parse(body)

    // Check if class exists
    const classData = await prisma.class.findUnique({
      where: { id: validatedData.classId },
    })

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Staff can only create exams for classes they're assigned to
    if (session.user.role === 'staff' && !classData.staffIds.includes(session.user.id)) {
      return NextResponse.json(
        { error: 'Forbidden. You can only create exams for classes you teach.' },
        { status: 403 }
      )
    }

    const exam = await prisma.exam.create({
      data: {
        classId: validatedData.classId,
        name: validatedData.name,
        date: new Date(validatedData.date),
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        subjects: validatedData.subjects as any,
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

    // Create audit log
    await createAuditLog('EXAM_CREATED', session.user.id, exam.id, {
      name: exam.name,
      classCode: classData.code,
      date: exam.date,
    })

    return NextResponse.json(
      {
        message: 'Exam created successfully',
        exam,
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

    console.error('Create exam error:', error)
    return NextResponse.json(
      { error: 'Failed to create exam' },
      { status: 500 }
    )
  }
}
