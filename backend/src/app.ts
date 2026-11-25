import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { auditLogsRouter } from "./modules/auditLogs/auditLogs.routes";
import { publicUniversitiesRouter } from "./modules/universities/universities.routes";
import { publicProgramsRouter } from "./modules/programs/programs.routes";
import { publicServicesRouter } from "./modules/services/services.routes";
import { publicFaqsRouter } from "./modules/faqs/faqs.routes";
import { publicArticlesRouter } from "./modules/articles/articles.routes";
import { publicSiteContentRouter } from "./modules/siteContent/siteContent.routes";
import { sitemapRouter } from "./modules/seo/sitemap.routes";
import { adminDashboardRouter } from "./modules/dashboard/dashboard.routes";
import { adminUniversitiesRouter } from "./modules/universities/universities.admin.routes";
import { adminProgramsRouter } from "./modules/programs/programs.admin.routes";
import { adminServicesRouter } from "./modules/services/services.admin.routes";
import { adminFaqsRouter } from "./modules/faqs/faqs.admin.routes";
import { adminArticlesRouter } from "./modules/articles/articles.admin.routes";
import { adminSiteContentRouter } from "./modules/siteContent/siteContent.admin.routes";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Health-check endpoint (verifies API + DB connectivity without leaking secrets)
app.get("/api/v1/public/health", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "ok",
      service: "ideolearn-api",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// Public Read-Only Catalogue & Site Content APIs
app.use("/api/v1/public/universities", publicUniversitiesRouter);
app.use("/api/v1/public/programs", publicProgramsRouter);
app.use("/api/v1/public/services", publicServicesRouter);
app.use("/api/v1/public/faqs", publicFaqsRouter);
app.use("/api/v1/public/articles", publicArticlesRouter);
app.use("/api/v1/public", publicSiteContentRouter);

// Dynamic SEO Sitemap
app.use("/", sitemapRouter);

// Admin Authentication & Audit Trail
app.use("/api/v1/admin/auth", authRouter);
app.use("/api/v1/admin/audit-logs", auditLogsRouter);

// Admin CMS CRUD & Configuration APIs
app.use("/api/v1/admin/dashboard", adminDashboardRouter);
app.use("/api/v1/admin/universities", adminUniversitiesRouter);
app.use("/api/v1/admin/programs", adminProgramsRouter);
app.use("/api/v1/admin/services", adminServicesRouter);
app.use("/api/v1/admin/faqs", adminFaqsRouter);
app.use("/api/v1/admin/articles", adminArticlesRouter);
app.use("/api/v1/admin", adminSiteContentRouter);

app.use(notFoundHandler);
app.use(errorHandler);