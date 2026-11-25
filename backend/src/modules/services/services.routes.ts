import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { validate, ValidatedData } from "../../middleware/validate";

export const publicServicesRouter = Router();

const listPublicServicesQuerySchema = z.object({
  featured: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
});

const serviceIdParamSchema = z.object({
  id: z.string().uuid("Invalid service ID"),
});

type ListPublicServicesQuery = z.infer<typeof listPublicServicesQuerySchema>;
type ServiceIdParam = z.infer<typeof serviceIdParamSchema>;

publicServicesRouter.get(
  "/",
  validate({ query: listPublicServicesQuerySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = res.locals.validated as ValidatedData<unknown, ListPublicServicesQuery>;

      const services = await prisma.service.findMany({
        where: {
          status: "PUBLISHED",
          ...(query.featured !== undefined ? { isFeatured: query.featured } : {}),
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      });

      res.status(200).json({ success: true, data: services });
    } catch (err) {
      next(err);
    }
  }
);

publicServicesRouter.get(
  "/:id",
  validate({ params: serviceIdParamSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { params } = res.locals.validated as ValidatedData<unknown, unknown, ServiceIdParam>;

      const service = await prisma.service.findFirst({
        where: { id: params.id, status: "PUBLISHED" },
      });

      if (!service) {
        throw new AppError(404, "SERVICE_NOT_FOUND", "Service not found");
      }

      res.status(200).json({ success: true, data: service });
    } catch (err) {
      next(err);
    }
  }
);