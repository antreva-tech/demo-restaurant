"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createItemSchema, updateItemSchema } from "@/lib/validators/item";

function parseTags(v: string): string[] {
  if (!v?.trim()) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function createItem(formData: FormData) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado" };

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    priceCents: Math.round(Number((formData.get("priceCents") as string) || 0) * 100),
    categoryId: formData.get("categoryId") as string,
    locationId: formData.get("locationId") as string,
    imageUrl: (formData.get("imageUrl") as string) || undefined,
    isActive: formData.get("isActive") === "on",
    isAvailable: formData.get("isAvailable") === "on",
    tags: parseTags((formData.get("tags") as string) || ""),
  };
  if (raw.imageUrl === "") raw.imageUrl = undefined;
  const parsed = createItemSchema.safeParse(raw);
  if (!parsed.success) return { error: "Datos inválidos" };

  try {
    await prisma.menuItem.create({
      data: { ...parsed.data, restaurantId },
    });
    revalidatePath("/admin/items");
    revalidatePath("/r/[restaurantSlug]/l/[locationSlug]");
    return { ok: true };
  } catch {
    return { error: "Error al crear producto" };
  }
}

export async function updateItem(id: string, formData: FormData) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado" };

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    priceCents: Math.round(Number((formData.get("priceCents") as string) || 0) * 100),
    categoryId: formData.get("categoryId") as string,
    locationId: formData.get("locationId") as string,
    imageUrl: (formData.get("imageUrl") as string) || undefined,
    isActive: formData.get("isActive") === "on",
    isAvailable: formData.get("isAvailable") === "on",
    tags: parseTags((formData.get("tags") as string) || ""),
  };
  if (raw.imageUrl === "") raw.imageUrl = undefined;
  const parsed = updateItemSchema.safeParse(raw);
  if (!parsed.success) return { error: "Datos inválidos" };

  try {
    await prisma.menuItem.updateMany({
      where: { id, restaurantId },
      data: parsed.data,
    });
    revalidatePath("/admin/items");
    revalidatePath("/r/[restaurantSlug]/l/[locationSlug]");
    return { ok: true };
  } catch {
    return { error: "Error al actualizar" };
  }
}
