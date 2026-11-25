import { z } from "zod";

export const listPublicUniversitiesQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  featured: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
});

export const universitySlugParamSchema = z.object({
  slug: z.string().trim().min(1).max(180),
});

export type ListPublicUniversitiesQuery = z.infer<typeof listPublicUniversitiesQuerySchema>;
export type UniversitySlugParam = z.infer<typeof universitySlugParamSchema>;