import { z } from 'zod'

export const createClassSchema = z.object({
  name: z.string().min(2, 'Class name must be at least 2 characters'),
  code: z.string().min(2, 'Class code must be at least 2 characters'),
  department: z.string().min(2, 'Department is required'),
  staffIds: z.array(z.string()).optional().default([]),
  studentIds: z.array(z.string()).optional().default([]),
})

export const updateClassSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).optional(),
  department: z.string().min(2).optional(),
  staffIds: z.array(z.string()).optional(),
  studentIds: z.array(z.string()).optional(),
})

export type CreateClassInput = z.infer<typeof createClassSchema>
export type UpdateClassInput = z.infer<typeof updateClassSchema>
