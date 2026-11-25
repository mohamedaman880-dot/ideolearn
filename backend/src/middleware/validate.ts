import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../utils/AppError";

interface ValidationSchemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

export interface ValidatedData<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown,
> {
  body: TBody;
  query: TQuery;
  params: TParams;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validated: ValidatedData = {
      body: req.body,
      query: req.query,
      params: req.params,
    };

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        return next(
          new AppError(400, "VALIDATION_ERROR", "Invalid request body", result.error.issues)
        );
      }
      req.body = result.data;
      validated.body = result.data;
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        return next(
          new AppError(400, "VALIDATION_ERROR", "Invalid query parameters", result.error.issues)
        );
      }
      validated.query = result.data;
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        return next(
          new AppError(400, "VALIDATION_ERROR", "Invalid route parameters", result.error.issues)
        );
      }
      validated.params = result.data;
    }

    res.locals.validated = validated;
    next();
  };
}