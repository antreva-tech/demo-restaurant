import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const logLevel: ("error" | "warn")[] =
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

/**
 * Creates PrismaClient. Uses Neon serverless adapter when DATABASE_URL points to Neon
 * to avoid "Connection closed" errors from idle TCP connections (Neon scales compute to zero).
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString?.includes("neon.tech")) {
    const { neonConfig } = require("@neondatabase/serverless");
    const { PrismaNeon } = require("@prisma/adapter-neon");
    const ws = require("ws");
    neonConfig.webSocketConstructor = ws;
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({ adapter, log: logLevel });
  }
  return new PrismaClient({ log: logLevel });
}

/**
 * Singleton PrismaClient for serverless. Reuse in dev to avoid too many connections.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
