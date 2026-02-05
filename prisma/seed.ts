import { PrismaClient, Role, PaymentMethod } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

/** Food placeholder images (Unsplash, w=500 h=400 crop). */
const PLACEHOLDERS = {
  drink:
    "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&h=400&fit=crop",
  soda:
    "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&h=400&fit=crop",
  water:
    "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=500&h=400&fit=crop",
  juice:
    "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=500&h=400&fit=crop",
  coffee:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&h=400&fit=crop",
  main:
    "https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?w=500&h=400&fit=crop",
  chicken:
    "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=500&h=400&fit=crop",
  pasta:
    "https://images.unsplash.com/photo-1551183053-bf91a1f81111?w=500&h=400&fit=crop",
  fish:
    "https://images.unsplash.com/photo-1519708227418-8e0c8c2d0b8e?w=500&h=400&fit=crop",
  salad:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=400&fit=crop",
  dessert:
    "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&h=400&fit=crop",
  flan:
    "https://images.unsplash.com/photo-1551024506-0bccbef8286d?w=500&h=400&fit=crop",
  cake:
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&h=400&fit=crop",
  icecream:
    "https://images.unsplash.com/photo-1560008581-98ca2fdaea77?w=500&h=400&fit=crop",
};

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

  const catBebidas =
    (await prisma.category.findFirst({
      where: { restaurantId: restaurant.id, locationId: location.id, name: "Bebidas" },
    })) ??
    (await prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        locationId: location.id,
        name: "Bebidas",
        sortOrder: 0,
        isActive: true,
      },
    }));
  const catPlatos =
    (await prisma.category.findFirst({
      where: { restaurantId: restaurant.id, locationId: location.id, name: "Platos principales" },
    })) ??
    (await prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        locationId: location.id,
        name: "Platos principales",
        sortOrder: 1,
        isActive: true,
      },
    }));
  const catPostres =
    (await prisma.category.findFirst({
      where: { restaurantId: restaurant.id, locationId: location.id, name: "Postres" },
    })) ??
    (await prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        locationId: location.id,
        name: "Postres",
        sortOrder: 2,
        isActive: true,
      },
    }));

  const ensureItem = async (opts: {
    categoryId: string;
    name: string;
    description?: string;
    priceCents: number;
    imageUrl?: string;
    tags?: string[];
  }) => {
    const exists = await prisma.menuItem.findFirst({
      where: {
        restaurantId: restaurant.id,
        locationId: location.id,
        categoryId: opts.categoryId,
        name: opts.name,
      },
    });
    if (exists) {
      await prisma.menuItem.update({
        where: { id: exists.id },
        data: { imageUrl: opts.imageUrl ?? exists.imageUrl, tags: opts.tags ?? exists.tags },
      });
      return exists;
    }
    return prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        locationId: location.id,
        categoryId: opts.categoryId,
        name: opts.name,
        description: opts.description,
        priceCents: opts.priceCents,
        imageUrl: opts.imageUrl,
        isActive: true,
        isAvailable: true,
        tags: opts.tags ?? [],
      },
    });
  };

  await ensureItem({
    categoryId: catBebidas.id,
    name: "Refresco",
    description: "Refresco de cola o naranja, servido con hielo",
    priceCents: 7500,
    imageUrl: PLACEHOLDERS.soda,
    tags: [],
  });
  await ensureItem({
    categoryId: catBebidas.id,
    name: "Agua mineral",
    description: "Agua mineral 500 ml",
    priceCents: 5000,
    imageUrl: PLACEHOLDERS.water,
    tags: [],
  });
  await ensureItem({
    categoryId: catBebidas.id,
    name: "Jugo natural",
    description: "Jugo de naranja, chinola o piña del día",
    priceCents: 12000,
    imageUrl: PLACEHOLDERS.juice,
    tags: [],
  });
  await ensureItem({
    categoryId: catBebidas.id,
    name: "Café",
    description: "Café dominicano, expresso o con leche",
    priceCents: 8000,
    imageUrl: PLACEHOLDERS.coffee,
    tags: [],
  });
  await ensureItem({
    categoryId: catBebidas.id,
    name: "Mamajuana",
    description: "Bebida típica dominicana (porción)",
    priceCents: 15000,
    imageUrl: PLACEHOLDERS.drink,
    tags: ["típico"],
  });

  await ensureItem({
    categoryId: catPlatos.id,
    name: "Pollo al horno",
    description: "Pollo con vegetales y viandas",
    priceCents: 35000,
    imageUrl: PLACEHOLDERS.chicken,
    tags: [],
  });
  await ensureItem({
    categoryId: catPlatos.id,
    name: "Pasta",
    description: "Spaghetti con salsa boloñesa o al pesto",
    priceCents: 28000,
    imageUrl: PLACEHOLDERS.pasta,
    tags: [],
  });
  await ensureItem({
    categoryId: catPlatos.id,
    name: "Pescado frito",
    description: "Pescado fresco frito con tostones",
    priceCents: 42000,
    imageUrl: PLACEHOLDERS.fish,
    tags: ["marisco"],
  });
  await ensureItem({
    categoryId: catPlatos.id,
    name: "Ensalada César",
    description: "Lechuga, pollo, queso parmesano y aderezo",
    priceCents: 22000,
    imageUrl: PLACEHOLDERS.salad,
    tags: ["ligero"],
  });
  await ensureItem({
    categoryId: catPlatos.id,
    name: "La bandera",
    description: "Arroz, habichuelas, pollo guisado y ensalada",
    priceCents: 38000,
    imageUrl: PLACEHOLDERS.main,
    tags: ["típico"],
  });

  await ensureItem({
    categoryId: catPostres.id,
    name: "Flan",
    description: "Flan de vainilla casero",
    priceCents: 12000,
    imageUrl: PLACEHOLDERS.flan,
    tags: [],
  });
  await ensureItem({
    categoryId: catPostres.id,
    name: "Pastel de chocolate",
    description: "Porción de pastel de chocolate",
    priceCents: 15000,
    imageUrl: PLACEHOLDERS.cake,
    tags: [],
  });
  await ensureItem({
    categoryId: catPostres.id,
    name: "Helado",
    description: "Dos bolas de helado, sabores del día",
    priceCents: 10000,
    imageUrl: PLACEHOLDERS.icecream,
    tags: [],
  });
  await ensureItem({
    categoryId: catPostres.id,
    name: "Dulce de leche",
    description: "Dulce de leche con galleta",
    priceCents: 8000,
    imageUrl: PLACEHOLDERS.dessert,
    tags: ["típico"],
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
    update: { passwordHash },
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
    update: { pinHash },
  });

  /** System user for online orders; never logs in. */
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

  const menuItems = await prisma.menuItem.findMany({
    where: { restaurantId: restaurant.id, locationId: location.id },
  });

  const paidAt = new Date();
  paidAt.setDate(paidAt.getDate() - 1);

  for (let i = 0; i < 5; i++) {
    const items = menuItems.slice(i * 2, i * 2 + 3).filter(Boolean);
    if (items.length === 0) break;
    const orderItems = items.map((it, idx) => ({
      menuItemId: it.id,
      nameSnapshot: it.name,
      unitPriceCentsSnapshot: it.priceCents,
      quantity: idx === 0 ? 2 : 1,
      lineTotalCents: (idx === 0 ? 2 : 1) * it.priceCents,
    }));
    const subtotalCents = orderItems.reduce((s, it) => s + it.lineTotalCents, 0);
    const taxCents = Math.round((subtotalCents * 1800) / 10000);
    const totalCents = subtotalCents + taxCents;
    const order = await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        locationId: location.id,
        employeeId: employee.id,
        status: "PAID",
        subtotalCents,
        taxCents,
        serviceChargeCents: 0,
        discountCents: 0,
        totalCents,
        paymentMethod: i % 3 === 0 ? PaymentMethod.CASH : i % 3 === 1 ? PaymentMethod.CARD : PaymentMethod.TRANSFER,
        cashReceivedCents: i % 3 === 0 ? totalCents + 500 : null,
        changeGivenCents: i % 3 === 0 ? 500 : null,
        paidAt: new Date(paidAt.getTime() + i * 3600000),
        items: {
          create: orderItems.map((it) => ({ ...it, notes: null })),
        },
      },
    });
  }

  console.log("Seed OK: restaurant", restaurant.slug, "owner", owner.email, "online user", onlineUser.email, "demo orders created");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
