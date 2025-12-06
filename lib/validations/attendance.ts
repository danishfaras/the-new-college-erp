import { z } from 'zod'
import { AttendanceRecord } from '@/types'

export const attendanceRecordSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  status: z.enum(['present', 'absent', 'late']),
  note: z.string().optional(),
})

export const createAttendanceSchema = z.object({
  classId: z.string().min(1, 'Class ID is required'),
  date: z.string().datetime(),
  records: z.array(attendanceRecordSchema),
})

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>
