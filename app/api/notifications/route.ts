import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { emitNotification } from '@/lib/socket'

const sendNotificationSchema = z.object({
  userId: z.string().optional(),
  classId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  type: z.enum(['info', 'warning', 'success', 'error']).optional(),
  link: z.string().optional(),
})

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
    const unreadOnly = searchParams.get('unread') === 'true'

    const where: any = { userId: session.user.id }
    if (unreadOnly) {
      where.read = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ notifications }, { status: 200 })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin or staff can send notifications
    if (session.user.role !== 'admin' && session.user.role !== 'staff') {
      return NextResponse.json(
        { error: 'Forbidden. Admin or staff access required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = sendNotificationSchema.parse(body)

    let userIds: string[] = []

    if (validatedData.userId) {
      userIds = [validatedData.userId]
    } else if (validatedData.classId) {
      // Get all students in the class
      const classData = await prisma.class.findUnique({
        where: { id: validatedData.classId },
      })

      if (!classData) {
        return NextResponse.json(
          { error: 'Class not found' },
          { status: 404 }
        )
      }

      // For now, we'll need to get students from a different source
      // This is a placeholder - in a real system, you'd have a StudentClass relation
      // For now, we'll create notifications for all users (this should be improved)
      const students = await prisma.user.findMany({
        where: { role: 'student' },
        select: { id: true },
      })
      userIds = students.map((s) => s.id)
    } else {
      return NextResponse.json(
        { error: 'Either userId or classId must be provided' },
        { status: 400 }
      )
    }

    // Create notifications for all target users
    const notifications = await Promise.all(
      userIds.map((userId) =>
        prisma.notification.create({
          data: {
            userId,
            title: validatedData.title,
            message: validatedData.message,
            type: validatedData.type || 'info',
            link: validatedData.link,
          },
        })
      )
    )

    // Emit Socket.IO notifications
    notifications.forEach((notification) => {
      emitNotification(notification.userId, notification)
    })

    return NextResponse.json(
      {
        message: 'Notifications sent successfully',
        count: notifications.length,
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

    console.error('Send notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
