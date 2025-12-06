import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'

let io: SocketIOServer | null = null

export function initializeSocket(server: HTTPServer) {
  if (io) return io

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  return io
}

export function getIO(): SocketIOServer | null {
  return io
}

export function emitTimetableUpdate(classId: string, timetable: any) {
  if (io) {
    io.to(`class:${classId}`).emit('timetable:updated', timetable)
  }
}

export function emitAttendanceUpdate(classId: string, attendance: any) {
  if (io) {
    io.to(`class:${classId}`).emit('attendance:updated', attendance)
  }
}

export function emitNotification(userId: string, notification: any) {
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', notification)
  }
}
