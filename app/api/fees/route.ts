import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { createFeeSchema } from '@/lib/validations/fees'
import { createAuditLog } from '@/lib/utils/audit'
import { sendEmail, getInvoiceEmailTemplate } from '@/lib/utils/email'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin or accounts can create fees
    if (session.user.role !== 'admin' && session.user.role !== 'accounts') {
      return NextResponse.json(
        { error: 'Forbidden. Admin or accounts access required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createFeeSchema.parse(body)

    // Check if student exists
    const student = await prisma.user.findUnique({
      where: { id: validatedData.studentId },
      include: { profile: true },
    })

    if (!student || student.role !== 'student') {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    const fee = await prisma.fee.create({
      data: {
        studentId: validatedData.studentId,
        amount: validatedData.amount,
        dueDate: new Date(validatedData.dueDate),
        invoiceId: validatedData.invoiceId,
      },
    })

    // Create audit log
    await createAuditLog('FEE_CREATED', session.user.id, fee.id, {
      studentId: validatedData.studentId,
      amount: validatedData.amount,
      dueDate: fee.dueDate,
    })

    // Send email notification
    if (student.email && student.name) {
      const invoiceId = fee.invoiceId || fee.id
      const { subject, html } = getInvoiceEmailTemplate(
        student.name,
        invoiceId,
        fee.amount,
        fee.dueDate
      )
      await sendEmail(student.email, subject, html)
    }

    return NextResponse.json(
      {
        message: 'Fee invoice created successfully',
        fee,
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

    console.error('Create fee error:', error)
    return NextResponse.json(
      { error: 'Failed to create fee invoice' },
      { status: 500 }
    )
  }
}
