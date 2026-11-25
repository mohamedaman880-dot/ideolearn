import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { ListPublicProgramsQuery } from "./programs.schema";

export async function listPublicPrograms(query: ListPublicProgramsQuery) {
  const skip = (query.page - 1) * query.limit;

  const universityFilter: Prisma.UniversityWhereInput = {
    status: "PUBLISHED",
  };

  if (query.universitySlug) {
    universityFilter.slug = query.universitySlug;
  }

  if (query.city) {
    universityFilter.city = { equals: query.city, mode: "insensitive" };
  }

  const where: Prisma.ProgramWhereInput = {
    status: "PUBLISHED",
    university: universityFilter,
  };

  if (query.faculty) {
    where.OR = [
      { facultyEn: { contains: query.faculty, mode: "insensitive" } },
      { facultyAr: { contains: query.faculty, mode: "insensitive" } },
    ];
  }

  if (query.durationYears !== undefined) {
    where.durationYears = query.durationYears;
  }

  if (query.maxTuition !== undefined) {
    where.annualTuitionUsd = { lte: query.maxTuition };
  }

  if (query.q) {
    const searchClauses: Prisma.ProgramWhereInput[] = [
      { nameEn: { contains: query.q, mode: "insensitive" } },
      { nameAr: { contains: query.q, mode: "insensitive" } },
      { descriptionEn: { contains: query.q, mode: "insensitive" } },
      { descriptionAr: { contains: query.q, mode: "insensitive" } },
      { facultyEn: { contains: query.q, mode: "insensitive" } },
      { facultyAr: { contains: query.q, mode: "insensitive" } },
    ];

    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchClauses }];
      delete where.OR;
    } else {
      where.OR = searchClauses;
    }
  }

  const [items, total] = await Promise.all([
    prisma.program.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: [{ createdAt: "desc" }, { nameEn: "asc" }],
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
        university: {
          select: {
            id: true,
            slug: true,
            nameEn: true,
            nameAr: true,
            city: true,
            logoUrl: true,
          },
        },
      },
    }),
    prisma.program.count({ where }),
  ]);

  return {
    items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getPublicProgramBySlug(slug: string) {
  const program = await prisma.program.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      university: { status: "PUBLISHED" },
    },
    include: {
      university: {
        select: {
          id: true,
          slug: true,
          nameEn: true,
          nameAr: true,
          city: true,
          country: true,
          logoUrl: true,
          officialWebsiteUrl: true,
        },
      },
    },
  });

  if (!program) {
    throw new AppError(404, "PROGRAM_NOT_FOUND", "Program not found");
  }

  return program;
}