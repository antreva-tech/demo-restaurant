import { z } from "zod";

export const updateRestaurantSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  posInactivityTimeoutMinutes: z.number().int().min(1).max(120).optional(),
});

export type UpdateRestaurantSettingsInput = z.infer<typeof updateRestaurantSettingsSchema>;
