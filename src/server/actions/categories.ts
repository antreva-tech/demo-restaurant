"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createCategorySchema, updateCategorySchema } from "@/lib/validators/category";

export async function createCategory(formData: FormData) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado" };

  const raw = {
    name: formData.get("name") as string,
    locationId: formData.get("locationId") as string,
    sortOrder: Number(formData.get("sortOrder")) || 0,
    isActive: formData.get("isActive") === "on",
  };
  const parsed = createCategorySchema.safeParse(raw);
  if (!parsed.success) return { error: "Datos inválidos" };

  try {
    await prisma.category.create({
      data: { ...parsed.data, restaurantId },
    });
    revalidatePath("/admin/categories");
    revalidatePath("/admin/items");
    return { ok: true };
  } catch {
    return { error: "Error al crear categoría" };
  }
}

export async function updateCategory(id: string, formData: FormData) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado" };

  const raw = {
    name: formData.get("name") as string,
    locationId: formData.get("locationId") as string,
    sortOrder: Number(formData.get("sortOrder")) || 0,
    isActive: formData.get("isActive") === "on",
  };
  const parsed = updateCategorySchema.safeParse(raw);
  if (!parsed.success) return { error: "Datos inválidos" };

  try {
    await prisma.category.updateMany({
      where: { id, restaurantId },
      data: parsed.data,
    });
    revalidatePath("/admin/categories");
    revalidatePath("/admin/items");
    return { ok: true };
  } catch {
    return { error: "Error al actualizar" };
  }
}
