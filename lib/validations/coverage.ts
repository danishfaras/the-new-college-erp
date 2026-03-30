import { z } from 'zod'

export const swapOfferSchema = z.object({
  classId: z.string().min(1),
  day: z.string().min(1),
  subject: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
})

export const createCoverRequestSchema = z.object({
  classId: z.string().min(1),
  date: z.string().min(1),
  day: z.string().min(1),
  subject: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  kind: z.enum(['cover', 'swap']).optional().default('cover'),
  swapOffer: swapOfferSchema.optional(),
})

export const releasePeriodSchema = z.object({
  classId: z.string().min(1),
  date: z.string().min(1),
  day: z.string().min(1),
  subject: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
})

export const claimReleaseSchema = z.object({
  releaseId: z.string().min(1),
})

export const patchCoverRequestSchema = z.object({
  action: z.enum(['accept', 'reject', 'cancel']),
})

export type CreateCoverRequestInput = z.infer<typeof createCoverRequestSchema>
