import { Prisma } from "@prisma/client";
import { AppError } from "./AppError";

export function handlePrismaError(err: unknown, entityLabel: string): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      throw new AppError(
        409,
        "DUPLICATE_RECORD",
        `${entityLabel} with the same unique identifier (such as slug) already exists`
      );
    }

    if (err.code === "P2003") {
      throw new AppError(
        409,
        "RELATION_CONSTRAINT",
        `Cannot complete operation because ${entityLabel.toLowerCase()} is referenced by related records or references an invalid ID`
      );
    }

    if (err.code === "P2025") {
      throw new AppError(404, "NOT_FOUND", `${entityLabel} not found`);
    }
  }

  throw err;
}