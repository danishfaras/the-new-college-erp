import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/utils/password'
import { createAuditLog } from '@/lib/utils/audit'
import { z } from 'zod'

const createStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['staff', 'accounts']).default('staff'),
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
    const validatedData = createStaffSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create staff user (approved: true by default for admin-created accounts)
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword,
        role: validatedData.role,
        approved: true, // Admin-created accounts are auto-approved
        profile: validatedData.department || validatedData.phone ? {
          create: {
            department: validatedData.department,
            phone: validatedData.phone,
          },
        } : undefined,
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

    // Create audit log
    await createAuditLog('STAFF_CREATED', session.user.id, user.id, {
      email: user.email,
      role: user.role,
    })

    return NextResponse.json(
      {
        message: 'Staff account created successfully',
        user,
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

    console.error('Create staff error:', error)
    return NextResponse.json(
      { error: 'Failed to create staff account' },
      { status: 500 }
    )
  }
}
