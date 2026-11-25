import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { ListPublicUniversitiesQuery } from "./universities.schema";

export async function listPublicUniversities(query: ListPublicUniversitiesQuery) {
  const where: Prisma.UniversityWhereInput = {
    status: "PUBLISHED",
  };

  if (query.city) {
    where.city = { equals: query.city, mode: "insensitive" };
  }

  if (query.featured !== undefined) {
    where.isFeatured = query.featured;
  }

  if (query.q) {
    where.OR = [
      { nameEn: { contains: query.q, mode: "insensitive" } },
      { nameAr: { contains: query.q, mode: "insensitive" } },
      { shortDescEn: { contains: query.q, mode: "insensitive" } },
      { shortDescAr: { contains: query.q, mode: "insensitive" } },
      { city: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return prisma.university.findMany({
    where,
    orderBy: [{ isFeatured: "desc" }, { nameEn: "asc" }],
    select: {
      id: true,
      slug: true,
      nameEn: true,
      nameAr: true,
      shortDescEn: true,
      shortDescAr: true,
      city: true,
      country: true,
      logoUrl: true,
      facultiesEn: true,
      facultiesAr: true,
      isFeatured: true,
      _count: {
        select: {
          programs: { where: { status: "PUBLISHED" } },
        },
      },
    },
  });
}

export async function getPublicUniversityBySlug(slug: string) {
  const university = await prisma.university.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
    },
    include: {
      programs: {
        where: { status: "PUBLISHED" },
        orderBy: [{ facultyEn: "asc" }, { nameEn: "asc" }],
        select: {
          id: true,
          slug: true,
          nameEn: true,
          nameAr: true,
          facultyEn: true,
          facultyAr: true,
          durationYears: true,
          annualTuitionUsd: true,
          totalTuitionUsd: true,
          appOpenDate: true,
          appCloseDate: true,
        },
      },
    },
  });

  if (!university) {
    throw new AppError(404, "UNIVERSITY_NOT_FOUND", "University not found");
  }

  return university;
}