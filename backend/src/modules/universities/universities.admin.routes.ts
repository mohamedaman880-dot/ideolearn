import { Router, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, getAuthenticatedAdmin } from "../../middleware/requireAuth";
import { validate, ValidatedData } from "../../middleware/validate";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../../utils/auditLog";
import { handlePrismaError } from "../../utils/prismaErrors";

export const adminUniversitiesRouter = Router();
adminUniversitiesRouter.use(requireAuth);

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const referenceLinkSchema = z.object({
  labelEn: z.string().trim().min(1).max(160),
  labelAr: z.string().trim().max(160).optional(),
  url: z.string().trim().url().max(500),
});

const listAdminUniversitiesQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

const universityIdParamSchema = z.object({
  id: z.string().uuid("Invalid university ID"),
});

const createUniversitySchema = z.object({
  slug: z.string().trim().toLowerCase().min(2).max(180).regex(slugRegex, "Slug must be lowercase letters, numbers, and hyphens"),
  nameEn: z.string().trim().min(2).max(200),
  nameAr: z.string().trim().min(2).max(200),
  shortDescEn: z.string().trim().min(5),
  shortDescAr: z.string().trim().min(5),
  fullDescEn: z.string().trim().min(10),
  fullDescAr: z.string().trim().min(10),
  city: z.string().trim().min(2).max(120),
  country: z.string().trim().min(2).max(120).default("Rwanda"),
  officialWebsiteUrl: z.string().trim().url().max(500).nullable().optional(),
  logoUrl: z.string().trim().url().max(500).nullable().optional(),
  galleryUrls: z.array(z.string().trim().url().max(500)).default([]),
  facultiesEn: z.array(z.string().trim().min(1).max(160)).default([]),
  facultiesAr: z.array(z.string().trim().min(1).max(160)).default([]),
  generalAdmissionEn: z.string().trim().nullable().optional(),
  generalAdmissionAr: z.string().trim().nullable().optional(),
  referenceLinks: z.array(referenceLinkSchema).default([]),
  isFeatured: z.boolean().default(false),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

const updateUniversitySchema = createUniversitySchema.partial();

type ListAdminUniversitiesQuery = z.infer<typeof listAdminUniversitiesQuerySchema>;
type UniversityIdParam = z.infer<typeof universityIdParamSchema>;
type CreateUniversityInput = z.infer<typeof createUniversitySchema>;
type UpdateUniversityInput = z.infer<typeof updateUniversitySchema>;

adminUniversitiesRouter.get(
  "/",
  validate({ query: listAdminUniversitiesQuerySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = res.locals.validated as ValidatedData<unknown, ListAdminUniversitiesQuery>;
      const where: Prisma.UniversityWhereInput = {};

      if (query.status) {
        where.status = query.status;
      }

      if (query.q) {
        where.OR = [
          { nameEn: { contains: query.q, mode: "insensitive" } },
          { nameAr: { contains: query.q, mode: "insensitive" } },
          { slug: { contains: query.q, mode: "insensitive" } },
          { city: { contains: query.q, mode: "insensitive" } },
        ];
      }

      const universities = await prisma.university.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        include: {
          _count: { select: { programs: true } },
        },
      });

      res.status(200).json({ success: true, data: universities });
    } catch (err) {
      next(err);
    }
  }
);

adminUniversitiesRouter.post(
  "/",
  validate({ body: createUniversitySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { body } = res.locals.validated as ValidatedData<CreateUniversityInput>;

      const university = await prisma.university.create({
        data: {
          ...body,
          referenceLinks: body.referenceLinks as Prisma.InputJsonValue,
        },
      });

      await recordAuditLog({
        adminId: admin.id,
        action: "CREATE",
        entityType: "university",
        entityId: university.id,
        details: { slug: university.slug, status: university.status },
      });

      res.status(201).json({ success: true, data: university });
    } catch (err) {
      try {
        handlePrismaError(err, "University");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);

adminUniversitiesRouter.get(
  "/:id",
  validate({ params: universityIdParamSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { params } = res.locals.validated as ValidatedData<unknown, unknown, UniversityIdParam>;
      const university = await prisma.university.findUnique({
        where: { id: params.id },
        include: {
          _count: { select: { programs: true } },
        },
      });

      if (!university) {
        throw new AppError(404, "UNIVERSITY_NOT_FOUND", "University not found");
      }

      res.status(200).json({ success: true, data: university });
    } catch (err) {
      next(err);
    }
  }
);

adminUniversitiesRouter.patch(
  "/:id",
  validate({ params: universityIdParamSchema, body: updateUniversitySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { params, body } = res.locals.validated as ValidatedData<
        UpdateUniversityInput,
        unknown,
        UniversityIdParam
      >;

      const { referenceLinks, ...rest } = body;
      const university = await prisma.university.update({
        where: { id: params.id },
        data: {
          ...rest,
          ...(referenceLinks !== undefined
            ? { referenceLinks: referenceLinks as Prisma.InputJsonValue }
            : {}),
        },
      });

      await recordAuditLog({
        adminId: admin.id,
        action: "UPDATE",
        entityType: "university",
        entityId: university.id,
        details: { updatedFields: Object.keys(body), status: university.status },
      });

      res.status(200).json({ success: true, data: university });
    } catch (err) {
      try {
        handlePrismaError(err, "University");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);

adminUniversitiesRouter.delete(
  "/:id",
  validate({ params: universityIdParamSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { params } = res.locals.validated as ValidatedData<unknown, unknown, UniversityIdParam>;

      const deleted = await prisma.university.delete({
        where: { id: params.id },
        select: { id: true, slug: true, nameEn: true },
      });

      await recordAuditLog({
        adminId: admin.id,
        action: "DELETE",
        entityType: "university",
        entityId: deleted.id,
        details: { slug: deleted.slug, nameEn: deleted.nameEn },
      });

      res.status(200).json({ success: true, data: deleted });
    } catch (err) {
      try {
        handlePrismaError(err, "University");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);