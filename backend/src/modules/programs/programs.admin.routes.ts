import { Router, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, getAuthenticatedAdmin } from "../../middleware/requireAuth";
import { validate, ValidatedData } from "../../middleware/validate";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../../utils/auditLog";
import { handlePrismaError } from "../../utils/prismaErrors";

export const adminProgramsRouter = Router();
adminProgramsRouter.use(requireAuth);

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const optionalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, "Date must be in YYYY-MM-DD or ISO format")
  .transform((val) => new Date(val))
  .nullable()
  .optional();

const listAdminProgramsQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  universityId: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const programIdParamSchema = z.object({
  id: z.string().uuid("Invalid program ID"),
});

const createProgramSchema = z.object({
  universityId: z.string().uuid("Valid university ID is required"),
  slug: z.string().trim().toLowerCase().min(2).max(200).regex(slugRegex, "Slug must be lowercase letters, numbers, and hyphens"),
  nameEn: z.string().trim().min(2).max(220),
  nameAr: z.string().trim().min(2).max(220),
  descriptionEn: z.string().trim().min(10),
  descriptionAr: z.string().trim().min(10),
  facultyEn: z.string().trim().min(2).max(160),
  facultyAr: z.string().trim().min(2).max(160),
  durationYears: z.number().positive().max(20),
  annualTuitionUsd: z.number().nonnegative().nullable().optional(),
  totalTuitionUsd: z.number().nonnegative().nullable().optional(),
  admissionReqEn: z.string().trim().min(5),
  admissionReqAr: z.string().trim().min(5),
  requiredDocsEn: z.string().trim().min(5),
  requiredDocsAr: z.string().trim().min(5),
  appOpenDate: optionalDateSchema,
  appCloseDate: optionalDateSchema,
  confirmationNoteEn: z.string().trim().nullable().optional(),
  confirmationNoteAr: z.string().trim().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

const updateProgramSchema = createProgramSchema.partial();

type ListAdminProgramsQuery = z.infer<typeof listAdminProgramsQuerySchema>;
type ProgramIdParam = z.infer<typeof programIdParamSchema>;
type CreateProgramInput = z.infer<typeof createProgramSchema>;
type UpdateProgramInput = z.infer<typeof updateProgramSchema>;

adminProgramsRouter.get(
  "/",
  validate({ query: listAdminProgramsQuerySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = res.locals.validated as ValidatedData<unknown, ListAdminProgramsQuery>;
      const skip = (query.page - 1) * query.limit;
      const where: Prisma.ProgramWhereInput = {};

      if (query.status) {
        where.status = query.status;
      }

      if (query.universityId) {
        where.universityId = query.universityId;
      }

      if (query.q) {
        where.OR = [
          { nameEn: { contains: query.q, mode: "insensitive" } },
          { nameAr: { contains: query.q, mode: "insensitive" } },
          { slug: { contains: query.q, mode: "insensitive" } },
          { facultyEn: { contains: query.q, mode: "insensitive" } },
          { facultyAr: { contains: query.q, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.program.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: [{ updatedAt: "desc" }],
          include: {
            university: {
              select: { id: true, slug: true, nameEn: true, nameAr: true, status: true },
            },
          },
        }),
        prisma.program.count({ where }),
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

adminProgramsRouter.post(
  "/",
  validate({ body: createProgramSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { body } = res.locals.validated as ValidatedData<CreateProgramInput>;

      const program = await prisma.program.create({
        data: body,
        include: {
          university: {
            select: { id: true, slug: true, nameEn: true, nameAr: true },
          },
        },
      });

      await recordAuditLog({
        adminId: admin.id,
        action: "CREATE",
        entityType: "program",
        entityId: program.id,
        details: { slug: program.slug, universityId: program.universityId, status: program.status },
      });

      res.status(201).json({ success: true, data: program });
    } catch (err) {
      try {
        handlePrismaError(err, "Program");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);

adminProgramsRouter.get(
  "/:id",
  validate({ params: programIdParamSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { params } = res.locals.validated as ValidatedData<unknown, unknown, ProgramIdParam>;
      const program = await prisma.program.findUnique({
        where: { id: params.id },
        include: {
          university: {
            select: { id: true, slug: true, nameEn: true, nameAr: true, status: true },
          },
        },
      });

      if (!program) {
        throw new AppError(404, "PROGRAM_NOT_FOUND", "Program not found");
      }

      res.status(200).json({ success: true, data: program });
    } catch (err) {
      next(err);
    }
  }
);

adminProgramsRouter.patch(
  "/:id",
  validate({ params: programIdParamSchema, body: updateProgramSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { params, body } = res.locals.validated as ValidatedData<
        UpdateProgramInput,
        unknown,
        ProgramIdParam
      >;

      const program = await prisma.program.update({
        where: { id: params.id },
        data: body,
        include: {
          university: {
            select: { id: true, slug: true, nameEn: true, nameAr: true },
          },
        },
      });

      await recordAuditLog({
        adminId: admin.id,
        action: "UPDATE",
        entityType: "program",
        entityId: program.id,
        details: { updatedFields: Object.keys(body), status: program.status },
      });

      res.status(200).json({ success: true, data: program });
    } catch (err) {
      try {
        handlePrismaError(err, "Program");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);

adminProgramsRouter.delete(
  "/:id",
  validate({ params: programIdParamSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { params } = res.locals.validated as ValidatedData<unknown, unknown, ProgramIdParam>;

      const deleted = await prisma.program.delete({
        where: { id: params.id },
        select: { id: true, slug: true, nameEn: true },
      });

      await recordAuditLog({
        adminId: admin.id,
        action: "DELETE",
        entityType: "program",
        entityId: deleted.id,
        details: { slug: deleted.slug, nameEn: deleted.nameEn },
      });

      res.status(200).json({ success: true, data: deleted });
    } catch (err) {
      try {
        handlePrismaError(err, "Program");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);