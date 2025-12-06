import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { signupSchema } from '@/lib/validations/auth'
import { hashPassword } from '@/lib/utils/password'
import { createAuditLog } from '@/lib/utils/audit'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = signupSchema.parse(body)

    // Only students can sign up themselves
    if (validatedData.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can sign up. Staff and admin accounts must be created by an administrator.' },
        { status: 403 }
      )
    }

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

    // Create user (approved: false for students)
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword,
        role: validatedData.role,
        approved: false, // Requires admin approval
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approved: true,
        createdAt: true,
      },
    })

    // Create audit log
    await createAuditLog('USER_SIGNUP', null, user.id, {
      email: user.email,
      role: user.role,
    })

    return NextResponse.json(
      {
        message: 'Account created successfully. Please wait for administrator approval.',
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

    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
