import { Request, Response, NextFunction, CookieOptions } from "express";
import { env } from "../../config/env";
import { ADMIN_COOKIE_NAME, getAuthenticatedAdmin } from "../../middleware/requireAuth";
import { LoginInput } from "./auth.schema";
import * as authService from "./auth.service";

const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

function getCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS,
  };
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as LoginInput;
    const { token, admin } = await authService.loginAdmin(input, req.ip);

    res.cookie(ADMIN_COOKIE_NAME, token, getCookieOptions());
    res.status(200).json({
      success: true,
      data: { admin },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const admin = getAuthenticatedAdmin(res);
    await authService.logoutAdmin(admin.id, req.ip);

    res.clearCookie(ADMIN_COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.status(200).json({
      success: true,
      data: { message: "Logged out successfully" },
    });
  } catch (err) {
    next(err);
  }
}

export async function me(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const current = getAuthenticatedAdmin(res);
    const admin = await authService.getAdminProfile(current.id);

    res.status(200).json({
      success: true,
      data: { admin },
    });
  } catch (err) {
    next(err);
  }
}