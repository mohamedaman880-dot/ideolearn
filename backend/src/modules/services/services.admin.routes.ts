import { Router, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, getAuthenticatedAdmin } from "../../middleware/requireAuth";
import { validate, ValidatedData } from "../../middleware/validate";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../../utils/auditLog";
import { handlePrismaError } from "../../utils/prismaErrors";

export const adminServicesRouter = Router();
adminServicesRouter.use(requireAuth);

const listAdminServicesQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

const serviceIdParamSchema = z.object({
  id: z.string().uuid("Invalid service ID"),
});

const createServiceSchema = z.object({
  titleEn: z.string().trim().min(2).max(180),
  titleAr: z.string().trim().min(2).max(180),
  descriptionEn: z.string().trim().min(5),
  descriptionAr: z.string().trim().min(5),
  imageUrl: z.string().trim().url().max(500).nullable().optional(),
  whatsappMessageEn: z.string().trim().min(2).max(500),
  whatsappMessageAr: z.string().trim().min(2).max(500),
  displayOrder: z.number().int().default(0),
  isFeatured: z.boolean().default(false),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

const updateServiceSchema = createServiceSchema.partial();

type ListAdminServicesQuery = z.infer<typeof listAdminServicesQuerySchema>;
type ServiceIdParam = z.infer<typeof serviceIdParamSchema>;
type CreateServiceInput = z.infer<typeof createServiceSchema>;
type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

adminServicesRouter.get(
  "/",
  validate({ query: listAdminServicesQuerySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = res.locals.validated as ValidatedData<unknown, ListAdminServicesQuery>;
      const where: Prisma.ServiceWhereInput = {};

      if (query.status) {
        where.status = query.status;
      }

      if (query.q) {
        where.OR = [
          { titleEn: { contains: query.q, mode: "insensitive" } },
          { titleAr: { contains: query.q, mode: "insensitive" } },
        ];
      }

      const services = await prisma.service.findMany({
        where,
        orderBy: [{ displayOrder: "asc" }, { updatedAt: "desc" }],
      });

      res.status(200).json({ success: true, data: services });
    } catch (err) {
      next(err);
    }
  }
);

adminServicesRouter.post(
  "/",
  validate({ body: createServiceSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { body } = res.locals.validated as ValidatedData<CreateServiceInput>;

      const service = await prisma.service.create({ data: body });

      await recordAuditLog({
        adminId: admin.id,
        action: "CREATE",
        entityType: "service",
        entityId: service.id,
        details: { titleEn: service.titleEn, status: service.status },
      });

      res.status(201).json({ success: true, data: service });
    } catch (err) {
      try {
        handlePrismaError(err, "Service");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);

adminServicesRouter.get(
  "/:id",
  validate({ params: serviceIdParamSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { params } = res.locals.validated as ValidatedData<unknown, unknown, ServiceIdParam>;
      const service = await prisma.service.findUnique({ where: { id: params.id } });

      if (!service) {
        throw new AppError(404, "SERVICE_NOT_FOUND", "Service not found");
      }

      res.status(200).json({ success: true, data: service });
    } catch (err) {
      next(err);
    }
  }
);

adminServicesRouter.patch(
  "/:id",
  validate({ params: serviceIdParamSchema, body: updateServiceSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { params, body } = res.locals.validated as ValidatedData<
        UpdateServiceInput,
        unknown,
        ServiceIdParam
      >;

      const service = await prisma.service.update({
        where: { id: params.id },
        data: body,
      });

      await recordAuditLog({
        adminId: admin.id,
        action: "UPDATE",
        entityType: "service",
        entityId: service.id,
        details: { updatedFields: Object.keys(body), status: service.status },
      });

      res.status(200).json({ success: true, data: service });
    } catch (err) {
      try {
        handlePrismaError(err, "Service");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);

adminServicesRouter.delete(
  "/:id",
  validate({ params: serviceIdParamSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { params } = res.locals.validated as ValidatedData<unknown, unknown, ServiceIdParam>;

      const deleted = await prisma.service.delete({
        where: { id: params.id },
        select: { id: true, titleEn: true },
      });

      await recordAuditLog({
        adminId: admin.id,
        action: "DELETE",
        entityType: "service",
        entityId: deleted.id,
        details: { titleEn: deleted.titleEn },
      });

      res.status(200).json({ success: true, data: deleted });
    } catch (err) {
      try {
        handlePrismaError(err, "Service");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);