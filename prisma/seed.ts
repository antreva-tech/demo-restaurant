import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

/**
 * Seed only ensures base structure and users exist. Does not create categories,
 * menu items, or orders. Does not overwrite or delete existing data.
 */
async function main() {
  const email = process.env.SEED_OWNER_EMAIL ?? "owner@demo.com";
  const password = process.env.SEED_OWNER_PASSWORD ?? "changeme";
  const passwordHash = await bcrypt.hash(password, 10);

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "demo" },
    create: {
      name: "Restaurante Demo",
      slug: "demo",
      currency: "DOP",
      timezone: "America/Santo_Domingo",
      taxRateBps: 1800,
      serviceChargeBps: 0,
      posInactivityTimeoutMinutes: 15,
    },
    update: {},
  });

  const location = await prisma.location.upsert({
    where: {
      restaurantId_slug: { restaurantId: restaurant.id, slug: "principal" },
    },
    create: {
      restaurantId: restaurant.id,
      name: "Sucursal Principal",
      slug: "principal",
      address: "Av. Principal 123, Santo Domingo, República Dominicana",
      isActive: true,
    },
    update: {},
  });

  const owner = await prisma.user.upsert({
    where: { email },
    create: {
      restaurantId: restaurant.id,
      name: "Owner Demo",
      email,
      passwordHash,
      role: Role.OWNER,
      isActive: true,
    },
    update: {},
  });

  const pinHash = await bcrypt.hash("1234", 10);
  const employee = await prisma.user.upsert({
    where: {
      restaurantId_employeeNumber: { restaurantId: restaurant.id, employeeNumber: "1001" },
    },
    create: {
      restaurantId: restaurant.id,
      name: "Empleado Demo",
      email: "empleado@demo.com",
      passwordHash: await bcrypt.hash("demo123", 10),
      role: Role.EMPLOYEE,
      isActive: true,
      employeeNumber: "1001",
      pinHash,
    },
    update: {},
  });

  const onlineUser = await prisma.user.upsert({
    where: { email: "online-demo@system" },
    create: {
      restaurantId: restaurant.id,
      name: "Online",
      email: "online-demo@system",
      passwordHash: await bcrypt.hash("no-login-system-user", 10),
      role: Role.EMPLOYEE,
      isActive: true,
      employeeNumber: "0000",
    },
    update: {},
  });

  console.log(
    "Seed OK: restaurant",
    restaurant.slug,
    "location",
    location.slug,
    "owner",
    owner.email,
    "online user",
    onlineUser.email
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
