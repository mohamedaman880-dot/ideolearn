import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/requireAuth";

export const adminDashboardRouter = Router();

adminDashboardRouter.get(
  "/",
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [
        uniPublished,
        uniDraft,
        progPublished,
        progDraft,
        servPublished,
        servDraft,
        faqPublished,
        faqDraft,
        artPublished,
        artDraft,
        mediaCount,
        settings,
        recentActivity,
      ] = await Promise.all([
        prisma.university.count({ where: { status: "PUBLISHED" } }),
        prisma.university.count({ where: { status: "DRAFT" } }),
        prisma.program.count({ where: { status: "PUBLISHED" } }),
        prisma.program.count({ where: { status: "DRAFT" } }),
        prisma.service.count({ where: { status: "PUBLISHED" } }),
        prisma.service.count({ where: { status: "DRAFT" } }),
        prisma.faq.count({ where: { status: "PUBLISHED" } }),
        prisma.faq.count({ where: { status: "DRAFT" } }),
        prisma.article.count({ where: { status: "PUBLISHED" } }),
        prisma.article.count({ where: { status: "DRAFT" } }),
        prisma.mediaAsset.count(),
        prisma.siteSettings.findUnique({
          where: { id: "default" },
          select: { faqsEnabled: true, articlesEnabled: true },
        }),
        prisma.auditLog.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            admin: { select: { id: true, email: true } },
          },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          counts: {
            universities: { published: uniPublished, draft: uniDraft, total: uniPublished + uniDraft },
            programs: { published: progPublished, draft: progDraft, total: progPublished + progDraft },
            services: { published: servPublished, draft: servDraft, total: servPublished + servDraft },
            faqs: { published: faqPublished, draft: faqDraft, total: faqPublished + faqDraft },
            articles: { published: artPublished, draft: artDraft, total: artPublished + artDraft },
            mediaAssets: mediaCount,
          },
          features: {
            faqsEnabled: settings?.faqsEnabled ?? true,
            articlesEnabled: settings?.articlesEnabled ?? true,
          },
          recentActivity,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);