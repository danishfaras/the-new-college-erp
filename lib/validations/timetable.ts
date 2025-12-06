import { z } from 'zod'
import { TimetableEntry } from '@/types'

export const timetableEntrySchema = z.object({
  day: z.string(),
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  subject: z.string().min(1, 'Subject is required'),
  staffId: z.string().min(1, 'Staff ID is required'),
  location: z.string().optional(),
})

export const updateTimetableSchema = z.object({
  entries: z.array(timetableEntrySchema),
})

export type UpdateTimetableInput = z.infer<typeof updateTimetableSchema>
