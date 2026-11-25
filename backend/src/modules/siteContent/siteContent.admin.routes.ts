import { Router, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, getAuthenticatedAdmin } from "../../middleware/requireAuth";
import { validate, ValidatedData } from "../../middleware/validate";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../../utils/auditLog";
import { handlePrismaError } from "../../utils/prismaErrors";

export const adminSiteContentRouter = Router();
adminSiteContentRouter.use(requireAuth);

const listAdminPageSectionsQuerySchema = z.object({
  pageKey: z.string().trim().min(1).max(50).optional(),
});

const pageSectionIdParamSchema = z.object({
  id: z.string().uuid("Invalid page section ID"),
});

const updatePageSectionSchema = z.object({
  titleEn: z.string().trim().max(250).nullable().optional(),
  titleAr: z.string().trim().max(250).nullable().optional(),
  subtitleEn: z.string().trim().nullable().optional(),
  subtitleAr: z.string().trim().nullable().optional(),
  bodyEn: z.string().trim().nullable().optional(),
  bodyAr: z.string().trim().nullable().optional(),
  imageUrl: z.string().trim().url().max(500).nullable().optional(),
  extraData: z.record(z.string(), z.unknown()).optional(),
  displayOrder: z.number().int().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

const updateSiteSettingsSchema = z.object({
  whatsappNumber: z.string().trim().max(30).nullable().optional(),
  phoneNumber: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().email().max(255).nullable().optional(),
  addressEn: z.string().trim().max(300).nullable().optional(),
  addressAr: z.string().trim().max(300).nullable().optional(),
  socialLinks: z.record(z.string(), z.string().trim().max(500)).optional(),
  accuracyNoticeEn: z.string().trim().min(5).optional(),
  accuracyNoticeAr: z.string().trim().min(5).optional(),
  legalNoticeEn: z.string().trim().nullable().optional(),
  legalNoticeAr: z.string().trim().nullable().optional(),
  faqsEnabled: z.boolean().optional(),
  articlesEnabled: z.boolean().optional(),
});

type ListAdminPageSectionsQuery = z.infer<typeof listAdminPageSectionsQuerySchema>;
type PageSectionIdParam = z.infer<typeof pageSectionIdParamSchema>;
type UpdatePageSectionInput = z.infer<typeof updatePageSectionSchema>;
type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsSchema>;

adminSiteContentRouter.get(
  "/page-sections",
  validate({ query: listAdminPageSectionsQuerySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = res.locals.validated as ValidatedData<unknown, ListAdminPageSectionsQuery>;

      const sections = await prisma.pageSection.findMany({
        where: query.pageKey ? { pageKey: query.pageKey } : {},
        orderBy: [{ pageKey: "asc" }, { displayOrder: "asc" }],
      });

      res.status(200).json({ success: true, data: sections });
    } catch (err) {
      next(err);
    }
  }
);

adminSiteContentRouter.patch(
  "/page-sections/:id",
  validate({ params: pageSectionIdParamSchema, body: updatePageSectionSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { params, body } = res.locals.validated as ValidatedData<
        UpdatePageSectionInput,
        unknown,
        PageSectionIdParam
      >;

      const { extraData, ...rest } = body;
      const section = await prisma.pageSection.update({
        where: { id: params.id },
        data: {
          ...rest,
          ...(extraData !== undefined ? { extraData: extraData as Prisma.InputJsonValue } : {}),
        },
      });

      await recordAuditLog({
        adminId: admin.id,
        action: "UPDATE",
        entityType: "page_section",
        entityId: section.id,
        details: {
          pageKey: section.pageKey,
          sectionKey: section.sectionKey,
          updatedFields: Object.keys(body),
          status: section.status,
        },
      });

      res.status(200).json({ success: true, data: section });
    } catch (err) {
      try {
        handlePrismaError(err, "Page section");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);

adminSiteContentRouter.get(
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

adminSiteContentRouter.patch(
  "/site-settings",
  validate({ body: updateSiteSettingsSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { body } = res.locals.validated as ValidatedData<UpdateSiteSettingsInput>;

      const { socialLinks, ...rest } = body;
      const settings = await prisma.siteSettings.update({
        where: { id: "default" },
        data: {
          ...rest,
          ...(socialLinks !== undefined
            ? { socialLinks: socialLinks as Prisma.InputJsonValue }
            : {}),
        },
      });

      await recordAuditLog({
        adminId: admin.id,
        action: "UPDATE",
        entityType: "site_settings",
        entityId: "default",
        details: { updatedFields: Object.keys(body) },
      });

      res.status(200).json({ success: true, data: settings });
    } catch (err) {
      try {
        handlePrismaError(err, "Site settings");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);