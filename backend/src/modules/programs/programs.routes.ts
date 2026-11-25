import { Router, Request, Response, NextFunction } from "express";
import { validate, ValidatedData } from "../../middleware/validate";
import {
  listPublicProgramsQuerySchema,
  ListPublicProgramsQuery,
  programSlugParamSchema,
  ProgramSlugParam,
} from "./programs.schema";
import * as programsService from "./programs.service";

export const publicProgramsRouter = Router();

publicProgramsRouter.get(
  "/",
  validate({ query: listPublicProgramsQuerySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = res.locals.validated as ValidatedData<unknown, ListPublicProgramsQuery>;
      const result = await programsService.listPublicPrograms(query);
      res.status(200).json({
        success: true,
        data: result.items,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }
);

publicProgramsRouter.get(
  "/:slug",
  validate({ params: programSlugParamSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { params } = res.locals.validated as ValidatedData<unknown, unknown, ProgramSlugParam>;
      const program = await programsService.getPublicProgramBySlug(params.slug);
      res.status(200).json({ success: true, data: program });
    } catch (err) {
      next(err);
    }
  }
);