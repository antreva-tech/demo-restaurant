import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().optional(),
  priceCents: z.number().int().min(0, "Precio debe ser ≥ 0"),
  categoryId: z.string().min(1, "Categoría requerida"),
  locationId: z.string().min(1, "Ubicación requerida"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional().default(true),
  isAvailable: z.boolean().optional().default(true),
  tags: z.array(z.string()).optional().default([]),
});

export const updateItemSchema = createItemSchema;

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
