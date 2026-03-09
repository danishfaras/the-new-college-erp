import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/utils/password'
import { createAuditLog } from '@/lib/utils/audit'
import { z } from 'zod'

const createStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rollNo: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
})

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
    const validatedData = createStudentSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(validatedData.password)

    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword,
        role: 'student',
        approved: true,
        profile:
          validatedData.rollNo ||
          validatedData.department ||
          validatedData.phone
            ? {
                create: {
                  rollNo: validatedData.rollNo,
                  department: validatedData.department,
                  phone: validatedData.phone,
                },
              }
            : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approved: true,
        createdAt: true,
        profile: true,
      },
    })

    await createAuditLog('STUDENT_CREATED', session.user.id, user.id, {
      email: user.email,
      role: user.role,
    })

    return NextResponse.json(
      { message: 'Student account created successfully', user },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Create student error:', error)
    return NextResponse.json(
      { error: 'Failed to create student account' },
      { status: 500 }
    )
  }
}
