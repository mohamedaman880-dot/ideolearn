import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface AuditLogInput {
  adminId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Prisma.InputJsonValue;
}

export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      adminId: input.adminId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      details: input.details ?? {},
    },
  });
}