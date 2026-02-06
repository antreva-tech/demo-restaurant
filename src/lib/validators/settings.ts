import { z } from "zod";

export const updateRestaurantSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  posInactivityTimeoutMinutes: z.number().int().min(1).max(120).optional(),
  allowCash: z.boolean().optional(),
  allowTransfer: z.boolean().optional(),
  allowCard: z.boolean().optional(),
});

export type UpdateRestaurantSettingsInput = z.infer<typeof updateRestaurantSettingsSchema>;
