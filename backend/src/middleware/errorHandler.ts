import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, "NOT_FOUND", `Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({
        success: false,
        error: {
          code: "CONFLICT",
          message: "A record with this unique value (such as slug or email) already exists.",
        },
      });
      return;
    }

    if (err.code === "P2003") {
      res.status(409).json({
        success: false,
        error: {
          code: "REFERENTIAL_INTEGRITY_ERROR",
          message: "Operation blocked because related records still depend on this item.",
        },
      });
      return;
    }

    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "The requested record was not found.",
        },
      });
      return;
    }
  }

  if (env.NODE_ENV !== "production") {
    console.error("Unhandled Error:", err);
  }

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred.",
    },
  });
}