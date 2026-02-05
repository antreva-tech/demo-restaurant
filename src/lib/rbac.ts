import type { Session } from "next-auth";
import { Role } from "@prisma/client";

export type SessionWithRole = Session & {
  user: { id: string; email?: string | null; name?: string | null; image?: string | null };
  restaurantId?: string | null;
  role?: Role | null;
};

export function canAccessAdmin(session: SessionWithRole | null): boolean {
  if (!session?.user || !session.restaurantId) return false;
  const r = session.role;
  return r === Role.OWNER || r === Role.ADMIN || r === Role.MANAGER;
}

export function canAccessPos(session: SessionWithRole | null): boolean {
  if (!session?.user || !session.restaurantId) return false;
  return true;
}

export function canManageUsers(session: SessionWithRole | null): boolean {
  if (!session?.user || !session.restaurantId) return false;
  const r = session.role;
  return r === Role.OWNER || r === Role.ADMIN || r === Role.MANAGER;
}

export function canManageMenu(session: SessionWithRole | null): boolean {
  if (!session?.user || !session.restaurantId) return false;
  const r = session.role;
  return r === Role.OWNER || r === Role.ADMIN || r === Role.MANAGER;
}

export function isEmployeeOnly(session: SessionWithRole | null): boolean {
  return session?.role === Role.EMPLOYEE;
}
