import { Router, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, getAuthenticatedAdmin } from "../../middleware/requireAuth";
import { validate, ValidatedData } from "../../middleware/validate";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../../utils/auditLog";
import { handlePrismaError } from "../../utils/prismaErrors";

export const adminArticlesRouter = Router();
adminArticlesRouter.use(requireAuth);

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const listAdminArticlesQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const articleIdParamSchema = z.object({
  id: z.string().uuid("Invalid article ID"),
});

const createArticleSchema = z.object({
  slug: z.string().trim().toLowerCase().min(2).max(200).regex(slugRegex, "Slug must be lowercase letters, numbers, and hyphens"),
  titleEn: z.string().trim().min(3).max(250),
  titleAr: z.string().trim().min(3).max(250),
  excerptEn: z.string().trim().min(10),
  excerptAr: z.string().trim().min(10),
  contentEn: z.string().trim().min(20),
  contentAr: z.string().trim().min(20),
  categoryEn: z.string().trim().min(2).max(120),
  categoryAr: z.string().trim().min(2).max(120),
  coverImageUrl: z.string().trim().url().max(500).nullable().optional(),
  seoTitleEn: z.string().trim().max(160).nullable().optional(),
  seoTitleAr: z.string().trim().max(160).nullable().optional(),
  seoDescriptionEn: z.string().trim().max(320).nullable().optional(),
  seoDescriptionAr: z.string().trim().max(320).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  publishedAt: z
    .string()
    .datetime()
    .transform((val) => new Date(val))
    .nullable()
    .optional(),
});

const updateArticleSchema = createArticleSchema.partial();

type ListAdminArticlesQuery = z.infer<typeof listAdminArticlesQuerySchema>;
type ArticleIdParam = z.infer<typeof articleIdParamSchema>;
type CreateArticleInput = z.infer<typeof createArticleSchema>;
type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

adminArticlesRouter.get(
  "/",
  validate({ query: listAdminArticlesQuerySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = res.locals.validated as ValidatedData<unknown, ListAdminArticlesQuery>;
      const skip = (query.page - 1) * query.limit;
      const where: Prisma.ArticleWhereInput = {};

      if (query.status) {
        where.status = query.status;
      }

      if (query.q) {
        where.OR = [
          { titleEn: { contains: query.q, mode: "insensitive" } },
          { titleAr: { contains: query.q, mode: "insensitive" } },
          { slug: { contains: query.q, mode: "insensitive" } },
          { categoryEn: { contains: query.q, mode: "insensitive" } },
          { categoryAr: { contains: query.q, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.article.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: [{ updatedAt: "desc" }],
        }),
        prisma.article.count({ where }),
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

adminArticlesRouter.post(
  "/",
  validate({ body: createArticleSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { body } = res.locals.validated as ValidatedData<CreateArticleInput>;

      const publishedAt =
        body.publishedAt !== undefined
          ? body.publishedAt
          : body.status === "PUBLISHED"
            ? new Date()
            : null;

      const article = await prisma.article.create({
        data: {
          ...body,
          publishedAt,
        },
      });

      await recordAuditLog({
        adminId: admin.id,
        action: "CREATE",
        entityType: "article",
        entityId: article.id,
        details: { slug: article.slug, status: article.status },
      });

      res.status(201).json({ success: true, data: article });
    } catch (err) {
      try {
        handlePrismaError(err, "Article");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);

adminArticlesRouter.get(
  "/:id",
  validate({ params: articleIdParamSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { params } = res.locals.validated as ValidatedData<unknown, unknown, ArticleIdParam>;
      const article = await prisma.article.findUnique({ where: { id: params.id } });

      if (!article) {
        throw new AppError(404, "ARTICLE_NOT_FOUND", "Article not found");
      }

      res.status(200).json({ success: true, data: article });
    } catch (err) {
      next(err);
    }
  }
);

adminArticlesRouter.patch(
  "/:id",
  validate({ params: articleIdParamSchema, body: updateArticleSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { params, body } = res.locals.validated as ValidatedData<
        UpdateArticleInput,
        unknown,
        ArticleIdParam
      >;

      const existing = await prisma.article.findUnique({
        where: { id: params.id },
        select: { publishedAt: true },
      });

      if (!existing) {
        throw new AppError(404, "ARTICLE_NOT_FOUND", "Article not found");
      }

      const shouldAutoSetPublishedAt =
        body.status === "PUBLISHED" &&
        body.publishedAt === undefined &&
        existing.publishedAt === null;

      const article = await prisma.article.update({
        where: { id: params.id },
        data: {
          ...body,
          ...(shouldAutoSetPublishedAt ? { publishedAt: new Date() } : {}),
        },
      });

      await recordAuditLog({
        adminId: admin.id,
        action: "UPDATE",
        entityType: "article",
        entityId: article.id,
        details: { updatedFields: Object.keys(body), status: article.status },
      });

      res.status(200).json({ success: true, data: article });
    } catch (err) {
      try {
        handlePrismaError(err, "Article");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);

adminArticlesRouter.delete(
  "/:id",
  validate({ params: articleIdParamSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = getAuthenticatedAdmin(res);
      const { params } = res.locals.validated as ValidatedData<unknown, unknown, ArticleIdParam>;

      const deleted = await prisma.article.delete({
        where: { id: params.id },
        select: { id: true, slug: true, titleEn: true },
      });

      await recordAuditLog({
        adminId: admin.id,
        action: "DELETE",
        entityType: "article",
        entityId: deleted.id,
        details: { slug: deleted.slug, titleEn: deleted.titleEn },
      });

      res.status(200).json({ success: true, data: deleted });
    } catch (err) {
      try {
        handlePrismaError(err, "Article");
      } catch (mappedErr) {
        next(mappedErr);
      }
    }
  }
);