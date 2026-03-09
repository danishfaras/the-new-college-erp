import { z } from 'zod'
import { AttendanceRecord } from '@/types'

export const attendanceRecordSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  status: z.enum(['present', 'absent', 'late']),
  note: z.string().optional(),
})

// Slot = one period from the timetable (attendance is per period, not per day)
export const attendanceSlotSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  day: z.string().min(1, 'Day is required'),
})

export const createAttendanceSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  slot: attendanceSlotSchema, // which period this attendance is for
  records: z.array(attendanceRecordSchema),
})

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>
