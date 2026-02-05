import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  locationId: z.string().min(1, "Ubicación requerida"),
  sortOrder: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateCategorySchema = createCategorySchema;

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
