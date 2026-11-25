import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

export const ADMIN_COOKIE_NAME = "ideolearn_admin_token";

export interface AuthenticatedAdmin {
  id: string;
  email: string;
}

export function getAuthenticatedAdmin(res: Response): AuthenticatedAdmin {
  const admin = res.locals.admin as AuthenticatedAdmin | undefined;
  if (!admin) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  return admin;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.[ADMIN_COOKIE_NAME] as string | undefined;

    if (!token) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    let decoded: unknown;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch {
      throw new AppError(401, "UNAUTHORIZED", "Invalid or expired session");
    }

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof (decoded as { sub?: unknown }).sub !== "string"
    ) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid session payload");
    }

    const adminId = (decoded as { sub: string }).sub;

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, email: true },
    });

    if (!admin) {
      throw new AppError(401, "UNAUTHORIZED", "Administrator account not found");
    }

    res.locals.admin = admin;
    next();
  } catch (err) {
    next(err);
  }
}