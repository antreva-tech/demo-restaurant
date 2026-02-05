import { z } from "zod";

const roleEnum = z.enum(["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"]);

export const createUserSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  role: roleEnum,
  employeeNumber: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: roleEnum.optional(),
  employeeNumber: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const setPinSchema = z.object({
  userId: z.string(),
  pin: z.string().min(4, "PIN mínimo 4 dígitos").max(6, "PIN máximo 6 dígitos"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type SetPinInput = z.infer<typeof setPinSchema>;
