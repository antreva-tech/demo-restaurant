import { z } from "zod";

export const createLocationSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  slug: z.string().min(1, "Slug requerido").regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  address: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateLocationSchema = createLocationSchema;

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
