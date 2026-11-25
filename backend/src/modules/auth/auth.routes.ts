import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../middleware/validate";
import { requireAuth } from "../../middleware/requireAuth";
import { loginSchema } from "./auth.schema";
import * as authController from "./auth.controller";

export const authRouter = Router();

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Block after 5 failed login attempts per IP
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many failed login attempts. Please try again in 15 minutes.",
      },
    });
  },
});

authRouter.post("/login", loginRateLimiter, validate({ body: loginSchema }), authController.login);
authRouter.post("/logout", requireAuth, authController.logout);
authRouter.get("/me", requireAuth, authController.me);