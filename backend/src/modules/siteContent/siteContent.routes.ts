import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { validate, ValidatedData } from "../../middleware/validate";

export const publicSiteContentRouter = Router();

const listPageSectionsQuerySchema = z.object({
  pageKey: z.string().trim().min(1).max(50).optional(),
});

type ListPageSectionsQuery = z.infer<typeof listPageSectionsQuerySchema>;

publicSiteContentRouter.get(
  "/site-settings",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await prisma.siteSettings.findUnique({
        where: { id: "default" },
      });

      if (!settings) {
        throw new AppError(404, "SETTINGS_NOT_FOUND", "Site settings not initialized");
      }

      res.status(200).json({ success: true, data: settings });
    } catch (err) {
      next(err);
    }
  }
);

publicSiteContentRouter.get(
  "/page-sections",
  validate({ query: listPageSectionsQuerySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = res.locals.validated as ValidatedData<unknown, ListPageSectionsQuery>;

      const sections = await prisma.pageSection.findMany({
        where: {
          status: "PUBLISHED",
          ...(query.pageKey ? { pageKey: query.pageKey } : {}),
        },
        orderBy: [{ pageKey: "asc" }, { displayOrder: "asc" }],
      });

      res.status(200).json({ success: true, data: sections });
    } catch (err) {
      next(err);
    }
  }
);