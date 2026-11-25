import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { validate, ValidatedData } from "../../middleware/validate";

export const publicFaqsRouter = Router();

const listPublicFaqsQuerySchema = z.object({
  category: z.string().trim().min(1).max(100).optional(),
});

type ListPublicFaqsQuery = z.infer<typeof listPublicFaqsQuerySchema>;

publicFaqsRouter.get(
  "/",
  validate({ query: listPublicFaqsQuerySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await prisma.siteSettings.findUnique({
        where: { id: "default" },
        select: { faqsEnabled: true },
      });

      if (settings && !settings.faqsEnabled) {
        res.status(200).json({
          success: true,
          data: [],
          meta: { enabled: false },
        });
        return;
      }

      const { query } = res.locals.validated as ValidatedData<unknown, ListPublicFaqsQuery>;

      const faqs = await prisma.faq.findMany({
        where: {
          status: "PUBLISHED",
          ...(query.category
            ? {
                OR: [
                  { categoryEn: { equals: query.category, mode: "insensitive" } },
                  { categoryAr: { equals: query.category, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      });

      res.status(200).json({
        success: true,
        data: faqs,
        meta: { enabled: true },
      });
    } catch (err) {
      next(err);
    }
  }
);