import { Router, Request, Response, NextFunction } from "express";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";

export const sitemapRouter = Router();

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

sitemapRouter.get(
  "/sitemap.xml",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const baseUrl = env.FRONTEND_URL.replace(/\/+$/, "");

      const [settings, universities, programs, articles] = await Promise.all([
        prisma.siteSettings.findUnique({
          where: { id: "default" },
          select: { faqsEnabled: true, articlesEnabled: true },
        }),
        prisma.university.findMany({
          where: { status: "PUBLISHED" },
          select: { slug: true, updatedAt: true },
        }),
        prisma.program.findMany({
          where: { status: "PUBLISHED", university: { status: "PUBLISHED" } },
          select: { slug: true, updatedAt: true },
        }),
        prisma.article.findMany({
          where: { status: "PUBLISHED" },
          select: { slug: true, updatedAt: true },
        }),
      ]);

      const staticPaths = ["/", "/universities", "/programs", "/services", "/about", "/contact"];
      if (settings?.faqsEnabled ?? true) {
        staticPaths.push("/faqs");
      }
      if (settings?.articlesEnabled ?? true) {
        staticPaths.push("/articles");
      }

      const urls: string[] = staticPaths.map(
        (path) =>
          `  <url>\n    <loc>${escapeXml(`${baseUrl}${path}`)}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`
      );

      for (const uni of universities) {
        urls.push(
          `  <url>\n    <loc>${escapeXml(`${baseUrl}/universities/${uni.slug}`)}</loc>\n    <lastmod>${uni.updatedAt.toISOString()}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`
        );
      }

      for (const prog of programs) {
        urls.push(
          `  <url>\n    <loc>${escapeXml(`${baseUrl}/programs/${prog.slug}`)}</loc>\n    <lastmod>${prog.updatedAt.toISOString()}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`
        );
      }

      if (settings?.articlesEnabled ?? true) {
        for (const art of articles) {
          urls.push(
            `  <url>\n    <loc>${escapeXml(`${baseUrl}/articles/${art.slug}`)}</loc>\n    <lastmod>${art.updatedAt.toISOString()}</lastmod>\n    <changefreq>monthly</changefreq>\n  </url>`
          );
        }
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.status(200).send(xml);
    } catch (err) {
      next(err);
    }
  }
);