import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/requireAuth";
import { validate, ValidatedData } from "../../middleware/validate";

export const auditLogsRouter = Router();

const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;

auditLogsRouter.get(
  "/",
  requireAuth,
  validate({ query: listAuditLogsQuerySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = res.locals.validated as ValidatedData<unknown, ListAuditLogsQuery>;
      const skip = (query.page - 1) * query.limit;

      const [items, total] = await Promise.all([
        prisma.auditLog.findMany({
          skip,
          take: query.limit,
          orderBy: { createdAt: "desc" },
          include: {
            admin: {
              select: { id: true, email: true },
            },
          },
        }),
        prisma.auditLog.count(),
      ]);

      res.status(200).json({
        success: true,
        data: items,
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);