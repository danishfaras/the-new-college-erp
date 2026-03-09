import { z } from 'zod'
import { AttendanceRecord } from '@/types'

export const attendanceRecordSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  status: z.enum(['present', 'absent', 'late']),
  note: z.string().optional(),
})

export const createAttendanceSchema = z.object({
  // classId comes from URL params in the API
  date: z.string().min(1, 'Date is required'), // YYYY-MM-DD or ISO datetime
  records: z.array(attendanceRecordSchema),
})

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>
