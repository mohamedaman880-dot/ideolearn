import { z } from "zod";

export const listPublicProgramsQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  universitySlug: z.string().trim().min(1).max(180).optional(),
  faculty: z.string().trim().min(1).max(160).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  durationYears: z.coerce.number().positive().max(10).optional(),
  maxTuition: z.coerce.number().nonnegative().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const programSlugParamSchema = z.object({
  slug: z.string().trim().min(1).max(200),
});

export type ListPublicProgramsQuery = z.infer<typeof listPublicProgramsQuerySchema>;
export type ProgramSlugParam = z.infer<typeof programSlugParamSchema>;