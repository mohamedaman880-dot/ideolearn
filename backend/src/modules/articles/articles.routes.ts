import { Router, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { validate, ValidatedData } from "../../middleware/validate";

export const publicArticlesRouter = Router();

const listPublicArticlesQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const articleSlugParamSchema = z.object({
  slug: z.string().trim().min(1).max(200),
});

type ListPublicArticlesQuery = z.infer<typeof listPublicArticlesQuerySchema>;
type ArticleSlugParam = z.infer<typeof articleSlugParamSchema>;

publicArticlesRouter.get(
  "/",
  validate({ query: listPublicArticlesQuerySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = res.locals.validated as ValidatedData<unknown, ListPublicArticlesQuery>;

      const settings = await prisma.siteSettings.findUnique({
        where: { id: "default" },
        select: { articlesEnabled: true },
      });

      if (settings && !settings.articlesEnabled) {
        res.status(200).json({
          success: true,
          data: [],
          meta: {
            enabled: false,
            page: query.page,
            limit: query.limit,
            total: 0,
            totalPages: 0,
          },
        });
        return;
      }

      const skip = (query.page - 1) * query.limit;
      const where: Prisma.ArticleWhereInput = {
        status: "PUBLISHED",
      };

      if (query.category) {
        where.OR = [
          { categoryEn: { equals: query.category, mode: "insensitive" } },
          { categoryAr: { equals: query.category, mode: "insensitive" } },
        ];
      }

      if (query.q) {
        const searchClauses: Prisma.ArticleWhereInput[] = [
          { titleEn: { contains: query.q, mode: "insensitive" } },
          { titleAr: { contains: query.q, mode: "insensitive" } },
          { excerptEn: { contains: query.q, mode: "insensitive" } },
          { excerptAr: { contains: query.q, mode: "insensitive" } },
        ];

        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: searchClauses }];
          delete where.OR;
        } else {
          where.OR = searchClauses;
        }
      }

      const [items, total] = await Promise.all([
        prisma.article.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            slug: true,
            titleEn: true,
            titleAr: true,
            excerptEn: true,
            excerptAr: true,
            categoryEn: true,
            categoryAr: true,
            coverImageUrl: true,
            publishedAt: true,
          },
        }),
        prisma.article.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: items,
        meta: {
          enabled: true,
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

publicArticlesRouter.get(
  "/:slug",
  validate({ params: articleSlugParamSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await prisma.siteSettings.findUnique({
        where: { id: "default" },
        select: { articlesEnabled: true },
      });

      if (settings && !settings.articlesEnabled) {
        throw new AppError(404, "ARTICLES_DISABLED", "Articles section is currently disabled");
      }

      const { params } = res.locals.validated as ValidatedData<unknown, unknown, ArticleSlugParam>;

      const article = await prisma.article.findFirst({
        where: { slug: params.slug, status: "PUBLISHED" },
      });

      if (!article) {
        throw new AppError(404, "ARTICLE_NOT_FOUND", "Article not found");
      }

      res.status(200).json({ success: true, data: article });
    } catch (err) {
      next(err);
    }
  }
);