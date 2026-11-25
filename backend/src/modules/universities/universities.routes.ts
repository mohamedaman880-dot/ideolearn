import { Router, Request, Response, NextFunction } from "express";
import { validate, ValidatedData } from "../../middleware/validate";
import {
  listPublicUniversitiesQuerySchema,
  ListPublicUniversitiesQuery,
  universitySlugParamSchema,
  UniversitySlugParam,
} from "./universities.schema";
import * as universitiesService from "./universities.service";

export const publicUniversitiesRouter = Router();

publicUniversitiesRouter.get(
  "/",
  validate({ query: listPublicUniversitiesQuerySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = res.locals.validated as ValidatedData<unknown, ListPublicUniversitiesQuery>;
      const universities = await universitiesService.listPublicUniversities(query);
      res.status(200).json({ success: true, data: universities });
    } catch (err) {
      next(err);
    }
  }
);

publicUniversitiesRouter.get(
  "/:slug",
  validate({ params: universitySlugParamSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { params } = res.locals.validated as ValidatedData<unknown, unknown, UniversitySlugParam>;
      const university = await universitiesService.getPublicUniversityBySlug(params.slug);
      res.status(200).json({ success: true, data: university });
    } catch (err) {
      next(err);
    }
  }
);