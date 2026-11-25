import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

async function main() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    console.error(
      "Error: ADMIN_EMAIL and ADMIN_PASSWORD (min 12 chars) must be set in backend/.env before running admin:seed."
    );
    process.exitCode = 1; return;
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);

  const admin = await prisma.admin.upsert({
    where: { email: env.ADMIN_EMAIL.toLowerCase().trim() },
    update: { passwordHash },
    create: {
      email: env.ADMIN_EMAIL.toLowerCase().trim(),
      passwordHash,
    },
    select: { id: true, email: true, createdAt: true },
  });

  console.log(`Single administrator provisioned: ${admin.email} (ID: ${admin.id})`);
}

main()
  .catch((err) => {
    console.error("Admin seed failed:", err);
    process.exitCode = 1; return;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });