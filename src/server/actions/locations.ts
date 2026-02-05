"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createLocationSchema, updateLocationSchema } from "@/lib/validators/location";

export async function createLocation(formData: FormData) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado" };

  const raw = {
    name: formData.get("name") as string,
    slug: formData.get("slug") as string,
    address: (formData.get("address") as string) || undefined,
    isActive: formData.get("isActive") === "on",
  };
  const parsed = createLocationSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors as unknown as string };

  try {
    await prisma.location.create({
      data: { ...parsed.data, restaurantId },
    });
    revalidatePath("/admin/locations");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { error: "Error al crear ubicación" };
  }
}

export async function updateLocation(id: string, formData: FormData) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado" };

  const raw = {
    name: formData.get("name") as string,
    slug: formData.get("slug") as string,
    address: (formData.get("address") as string) || undefined,
    isActive: formData.get("isActive") === "on",
  };
  const parsed = updateLocationSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors as unknown as string };

  try {
    await prisma.location.updateMany({
      where: { id, restaurantId },
      data: parsed.data,
    });
    revalidatePath("/admin/locations");
    return { ok: true };
  } catch {
    return { error: "Error al actualizar" };
  }
}
