import { z } from 'zod'

export const createFeeSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  amount: z.number().positive('Amount must be positive'),
  dueDate: z.string().datetime(),
  invoiceId: z.string().optional(),
})

export type CreateFeeInput = z.infer<typeof createFeeSchema>
