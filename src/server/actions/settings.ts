"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { updateRestaurantSettingsSchema } from "@/lib/validators/settings";

export async function updateRestaurantSettings(formData: FormData) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado" };

  const raw = {
    name: formData.get("name") as string,
    posInactivityTimeoutMinutes: Number(formData.get("posInactivityTimeoutMinutes")) || 15,
  };
  const parsed = updateRestaurantSettingsSchema.safeParse(raw);
  if (!parsed.success) return { error: "Datos inválidos" };

  try {
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: parsed.data,
    });
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/pos");
    return { ok: true };
  } catch {
    return { error: "Error al guardar" };
  }
}
