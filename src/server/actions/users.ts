"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { createUserSchema, updateUserSchema, setPinSchema } from "@/lib/validators/user";

export async function createUser(formData: FormData) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado" };

  const raw = {
    name: formData.get("name") as string,
    email: (formData.get("email") as string)?.trim().toLowerCase(),
    password: formData.get("password") as string,
    role: formData.get("role") as "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE",
    employeeNumber: (formData.get("employeeNumber") as string) || undefined,
    isActive: formData.get("isActive") === "on",
  };
  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) return { error: "Datos inválidos" };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  try {
    await prisma.user.create({
      data: {
        restaurantId,
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role,
        employeeNumber: parsed.data.employeeNumber ?? null,
        isActive: parsed.data.isActive,
      },
    });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return { error: "Error al crear usuario (¿correo ya existe?)" };
  }
}

export async function updateUser(id: string, formData: FormData) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado" };

  const raw: Record<string, unknown> = {
    name: formData.get("name") as string,
    email: (formData.get("email") as string)?.trim().toLowerCase(),
    role: formData.get("role") as string,
    employeeNumber: (formData.get("employeeNumber") as string) || undefined,
    isActive: formData.get("isActive") === "on",
  };
  const password = formData.get("password") as string;
  if (password?.length) raw.password = password;
  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) return { error: "Datos inválidos" };

  const data: {
    name?: string;
    email?: string;
    role?: Role;
    employeeNumber?: string | null;
    isActive?: boolean;
    passwordHash?: string;
  } = {
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role as Role,
    employeeNumber: parsed.data.employeeNumber ?? null,
    isActive: parsed.data.isActive,
  };
  if (parsed.data.password) data.passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    await prisma.user.updateMany({
      where: { id, restaurantId },
      data: data as Parameters<typeof prisma.user.updateMany>[0]["data"],
    });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch {
    return { error: "Error al actualizar" };
  }
}

export async function setUserPin(userId: string, pin: string) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado" };

  const parsed = setPinSchema.safeParse({ userId, pin });
  if (!parsed.success) return { error: "PIN debe tener 4-6 dígitos" };

  const pinHash = await bcrypt.hash(parsed.data.pin, 10);
  try {
    await prisma.user.updateMany({
      where: { id: parsed.data.userId, restaurantId },
      data: { pinHash },
    });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch {
    return { error: "Error al establecer PIN" };
  }
}
