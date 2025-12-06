import { prisma } from '@/lib/db/prisma'

export async function createAuditLog(
  action: string,
  actorId: string | null,
  targetId?: string | null,
  meta?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId: actorId || undefined,
        targetId: targetId || undefined,
        meta: meta ? (meta as object) : undefined,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw - audit logging should not break the main flow
  }
}
