import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";
import { authSecret } from "@/lib/env";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    restaurantId?: string | null;
    role?: Role | null;
    user: { id: string; email?: string | null; name?: string | null; image?: string | null };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret ?? undefined,
  trustHost: true,
  providers: [
    Credentials({
      id: "credentials",
      name: "Correo y contraseña",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({
          where: { email: email.trim().toLowerCase() },
          include: { restaurant: true },
        });
        if (!user?.passwordHash || !user.isActive || !user.restaurant) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          restaurantId: user.restaurantId,
          role: user.role,
        };
      },
    }),
    Credentials({
      id: "pos-pin",
      name: "Número de empleado y PIN",
      credentials: {
        employeeNumber: { label: "Número de empleado", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        const employeeNumber = credentials?.employeeNumber as string | undefined;
        const pin = credentials?.pin as string | undefined;
        if (!employeeNumber?.trim() || !pin) return null;
        const user = await prisma.user.findFirst({
          where: {
            employeeNumber: employeeNumber.trim(),
            pinHash: { not: null },
            isActive: true,
          },
          include: { restaurant: true },
        });
        if (!user?.pinHash || !user.restaurant) return null;
        const ok = await bcrypt.compare(pin, user.pinHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          restaurantId: user.restaurantId,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.restaurantId = (user as { restaurantId?: string }).restaurantId;
        token.role = (user as { role?: Role }).role;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        (session as { restaurantId?: string | null }).restaurantId =
          typeof token.restaurantId === "string" ? token.restaurantId : null;
        (session as { role?: Role | null }).role =
          typeof token.role === "string" ? (token.role as Role) : null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
