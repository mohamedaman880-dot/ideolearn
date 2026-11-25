import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../../utils/auditLog";
import { LoginInput } from "./auth.schema";

// Dummy hash ensures consistent timing even if the email does not exist
const DUMMY_PASSWORD_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEeO9k1x0V7X0i8H2uW1jL7n6e5r4t3y2u.";

export async function loginAdmin(input: LoginInput, ipAddress?: string) {
  const admin = await prisma.admin.findUnique({
    where: { email: input.email },
  });

  const hashToCompare = admin ? admin.passwordHash : DUMMY_PASSWORD_HASH;
  const isPasswordValid = await bcrypt.compare(input.password, hashToCompare);

  if (!admin || !isPasswordValid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const token = jwt.sign(
    { sub: admin.id, email: admin.email },
    env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  await recordAuditLog({
    adminId: admin.id,
    action: "LOGIN",
    entityType: "auth",
    entityId: admin.id,
    details: { ipAddress: ipAddress ?? "unknown" },
  });

  return {
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      createdAt: admin.createdAt,
    },
  };
}

export async function logoutAdmin(adminId: string, ipAddress?: string) {
  await recordAuditLog({
    adminId,
    action: "LOGOUT",
    entityType: "auth",
    entityId: adminId,
    details: { ipAddress: ipAddress ?? "unknown" },
  });
}

export async function getAdminProfile(adminId: string) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  if (!admin) {
    throw new AppError(401, "UNAUTHORIZED", "Administrator account not found");
  }

  return admin;
}