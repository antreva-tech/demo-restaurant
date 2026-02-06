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
    allowCash: formData.get("allowCash") === "on",
    allowTransfer: formData.get("allowTransfer") === "on",
    allowCard: formData.get("allowCard") === "on",
  };
  const parsed = updateRestaurantSettingsSchema.safeParse(raw);
  if (!parsed.success) return { error: "Datos inválidos" };

  const data: Record<string, unknown> = {};
  if (parsed.data.name != null) data.name = parsed.data.name;
  if (parsed.data.posInactivityTimeoutMinutes != null)
    data.posInactivityTimeoutMinutes = parsed.data.posInactivityTimeoutMinutes;
  if (parsed.data.allowCash != null) data.allowCash = parsed.data.allowCash;
  if (parsed.data.allowTransfer != null) data.allowTransfer = parsed.data.allowTransfer;
  if (parsed.data.allowCard != null) data.allowCard = parsed.data.allowCard;

  try {
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data,
    });
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/pos");
    return { ok: true };
  } catch {
    return { error: "Error al guardar" };
  }
}
