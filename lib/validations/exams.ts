import { z } from 'zod'
import { ExamSubject } from '@/types'

export const examSubjectSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  code: z.string().min(1, 'Subject code is required'),
  duration: z.string().min(1, 'Duration is required'),
})

export const createExamSchema = z.object({
  classId: z.string().min(1, 'Class ID is required'),
  name: z.string().min(2, 'Exam name must be at least 2 characters'),
  date: z.string().datetime(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  subjects: z.array(examSubjectSchema),
})

export type CreateExamInput = z.infer<typeof createExamSchema>
