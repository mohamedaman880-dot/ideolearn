import { Router, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, getAuthenticatedAdmin } from "../../middleware/requireAuth";
import { validate, ValidatedData } from "../../middleware/validate";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../../utils/auditLog";
import { handlePrismaError } from "../../utils/prismaErrors";

export const adminFaqsRouter = Router();
adminFaqsRouter.use(requireAuth);

const listAdminFaqsQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

const faqIdParamSchema = z.object({
  id: z.string().uuid("Invalid FAQ ID"),
});

const createFaqSchema = z.object({
  questionEn: z.string().trim().min(5).max(400),
  questionAr: z.string().trim().min(5).max(400),
  answerEn: z.string().trim().min(5),
  answerAr: z.string().trim().min(5),
  categoryEn: z.string().trim().max(100).nullable().optional(),
  categoryAr: z.string().trim().max(100).nullable().optional(),
  displayOrder: z.number().int().default(0),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

const updateFaqSchema = createFaqSchema.partial();

type ListAdminFaqsQuery = z.infer<typeof listAdminFaqsQuerySchema>;
type FaqIdParam = z.infer<typeof faqIdParamSchema>;
type CreateFaqInput = z.infer<typeof createFaqSchema>;
type UpdateFaqInput = z.infer<typeof updateFaqSchema>;

adminFaqsRouter.get(
  "/",
  validate({ query: listAdminFaqsQuerySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = res.locals.validated as ValidatedData<unknown, ListAdminFaqsQuery>;
      const where: Prisma.FaqWhereInput = {};

      if (query.status) {
        where.status = query.status;
      }

      if (query.q) {
        where.OR = [
          { questionEn: { contains: query.q, mode: "insensitive" } },
          { questionAr: { contains: query.q, mode: "insensitive" } },
          { answerEn: { contains: query.q, mode: "insensitive" } },
          { answerAr: { contains: query.q, mode: "insensitive" } },
        ];
      }

      const faqs = await prisma.faq.findMany({
        where,
        orderBy: [{ displayOrder: "asc" }, { updatedAt: "desc" }],
      });

      res.status(200).json({ success: true, data: faqs });
    } catch (err) {
      next(err);
    }
  }
);

adminFaqsRouter.post(
  "/",
  validate({ body: createFaqSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { body } = res.locals.validated as ValidatedData<CreateFaqInput>;

      const faq = await prisma.faq.create({ data: body });

      await recordAuditLog({
        adminId: admin.id,
        action: "CREATE",
        entityType: "faq",
        entityId: faq.id,
        details: { questionEn: faq.questionEn, status: faq.status },
      });

      res.status(201).json({ success: true, data: faq });
    } catch (err) {
      try {
        handlePrismaError(err, "FAQ");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);

adminFaqsRouter.get(
  "/:id",
  validate({ params: faqIdParamSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { params } = res.locals.validated as ValidatedData<unknown, unknown, FaqIdParam>;
      const faq = await prisma.faq.findUnique({ where: { id: params.id } });

      if (!faq) {
        throw new AppError(404, "FAQ_NOT_FOUND", "FAQ not found");
      }

      res.status(200).json({ success: true, data: faq });
    } catch (err) {
      next(err);
    }
  }
);

adminFaqsRouter.patch(
  "/:id",
  validate({ params: faqIdParamSchema, body: updateFaqSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { params, body } = res.locals.validated as ValidatedData<
        UpdateFaqInput,
        unknown,
        FaqIdParam
      >;

      const faq = await prisma.faq.update({
        where: { id: params.id },
        data: body,
      });

      await recordAuditLog({
        adminId: admin.id,
        action: "UPDATE",
        entityType: "faq",
        entityId: faq.id,
        details: { updatedFields: Object.keys(body), status: faq.status },
      });

      res.status(200).json({ success: true, data: faq });
    } catch (err) {
      try {
        handlePrismaError(err, "FAQ");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);

adminFaqsRouter.delete(
  "/:id",
  validate({ params: faqIdParamSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { params } = res.locals.validated as ValidatedData<unknown, unknown, FaqIdParam>;

      const deleted = await prisma.faq.delete({
        where: { id: params.id },
        select: { id: true, questionEn: true },
      });

      await recordAuditLog({
        adminId: admin.id,
        action: "DELETE",
        entityType: "faq",
        entityId: deleted.id,
        details: { questionEn: deleted.questionEn },
      });

      res.status(200).json({ success: true, data: deleted });
    } catch (err) {
      try {
        handlePrismaError(err, "FAQ");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);