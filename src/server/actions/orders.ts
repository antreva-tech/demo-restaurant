"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { computeOrderTotalInclusive } from "@/lib/money";
import { getOrderByIdForAdmin } from "@/server/queries/orders";
import type { PaymentMethod } from "@prisma/client";

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Returns the next orderNumber for the restaurant. Call inside a transaction; locks Restaurant row.
 */
export async function getNextOrderNumber(tx: PrismaTx, restaurantId: string): Promise<number> {
  await tx.$executeRaw`SELECT 1 FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`;
  const r = await tx.order.aggregate({ where: { restaurantId }, _max: { orderNumber: true } });
  return (r._max?.orderNumber ?? 0) + 1;
}

/** Item for createOrderAndPay / createOrderOpen; menuItemId null = custom/off-menu item. */
export type CreateOrderItem = {
  menuItemId: string | null;
  nameSnapshot: string;
  unitPriceCentsSnapshot: number;
  quantity: number;
  lineTotalCents: number;
  notes?: string;
};

/**
 * Creates an order in OPEN status (for deferred payment: link, terminal, transfer).
 * Returns orderId. Caller then creates Payment and later marks Order PAID.
 */
export async function createOrderOpen(params: {
  locationId: string;
  items: CreateOrderItem[];
  orderNotes?: string;
  discountCents?: number;
}) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  const userId = (session?.user as { id?: string })?.id;
  if (!restaurantId || !userId) return { error: "No autorizado", orderId: null as string | null };

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { taxRateBps: true, serviceChargeBps: true },
  });
  if (!restaurant) return { error: "Restaurant no encontrado", orderId: null as string | null };

  const subtotalCents = params.items.reduce((s, i) => s + i.lineTotalCents, 0);
  const discountCents = params.discountCents ?? 0;
  const { taxCents, serviceChargeCents, totalCents } = computeOrderTotalInclusive(
    subtotalCents,
    discountCents
  );

  const order = await prisma.$transaction(async (tx) => {
    const orderNumber = await getNextOrderNumber(tx, restaurantId);
    return tx.order.create({
      data: {
        restaurantId,
        locationId: params.locationId,
        employeeId: userId,
        orderNumber,
        status: "OPEN",
        notes: params.orderNotes ?? null,
        subtotalCents,
        taxCents,
        serviceChargeCents,
        discountCents,
        totalCents,
        items: {
          create: params.items.map((i) => {
            const base = {
              nameSnapshot: i.nameSnapshot,
              unitPriceCentsSnapshot: i.unitPriceCentsSnapshot,
              quantity: i.quantity,
              lineTotalCents: i.lineTotalCents,
              notes: i.notes ?? null,
            };
            return i.menuItemId != null ? { ...base, menuItemId: i.menuItemId } : base;
          }),
        },
      },
    });
  });

  revalidatePath("/admin/orders");
  revalidatePath("/pos");
  return { ok: true, orderId: order.id };
}

export async function createOrderAndPay(params: {
  locationId: string;
  items: CreateOrderItem[];
  orderNotes?: string;
  paymentMethod: PaymentMethod;
  cashReceivedCents?: number;
  discountCents?: number;
}) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  const userId = (session?.user as { id?: string })?.id;
  if (!restaurantId || !userId) return { error: "No autorizado" };

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });
  if (!restaurant) return { error: "Restaurant no encontrado" };

  const subtotalCents = params.items.reduce((s, i) => s + i.lineTotalCents, 0);
  const discountCents = params.discountCents ?? 0;
  const { taxCents, serviceChargeCents, totalCents } = computeOrderTotalInclusive(subtotalCents, discountCents);

  if (params.paymentMethod === "CASH" || params.paymentMethod === "MIXED") {
    const cash = params.cashReceivedCents ?? 0;
    if (cash < totalCents) return { error: "Efectivo recibido debe ser mayor o igual al total" };
  }

  const changeGivenCents =
    params.paymentMethod === "CASH" || params.paymentMethod === "MIXED"
      ? (params.cashReceivedCents ?? 0) - totalCents
      : null;

  const paymentChannel =
    params.paymentMethod === "CASH" || params.paymentMethod === "MIXED"
      ? "CASH"
      : params.paymentMethod === "TRANSFER"
        ? "TRANSFER"
        : "CARD";

  const order = await prisma.$transaction(async (tx) => {
    const orderNumber = await getNextOrderNumber(tx, restaurantId);
    return tx.order.create({
      data: {
        restaurantId,
        locationId: params.locationId,
        employeeId: userId,
        orderNumber,
        status: "PAID",
        notes: params.orderNotes ?? null,
        subtotalCents,
        taxCents,
        serviceChargeCents,
        discountCents,
        totalCents,
        paymentMethod: params.paymentMethod,
        paymentChannel,
        cashReceivedCents: params.cashReceivedCents ?? null,
        changeGivenCents,
        paidAt: new Date(),
        items: {
          create: params.items.map((i) => {
            const base = {
              nameSnapshot: i.nameSnapshot,
              unitPriceCentsSnapshot: i.unitPriceCentsSnapshot,
              quantity: i.quantity,
              lineTotalCents: i.lineTotalCents,
              notes: i.notes ?? null,
            };
            return i.menuItemId != null ? { ...base, menuItemId: i.menuItemId } : base;
          }),
        },
      },
    });
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true, orderId: order.id };
}

/**
 * Admin-only: update order fields (status, notes, customer info).
 * Revalidates admin order list and dashboard.
 */
export async function updateOrderAdmin(params: {
  orderId: string;
  status?: "OPEN" | "PAID" | "VOID";
  notes?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
}) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado" };

  await prisma.order.updateMany({
    where: { id: params.orderId, restaurantId },
    data: {
      ...(params.status != null && { status: params.status }),
      ...(params.notes !== undefined && { notes: params.notes }),
      ...(params.customerName !== undefined && { customerName: params.customerName }),
      ...(params.customerPhone !== undefined && { customerPhone: params.customerPhone }),
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Fetches a single order with items for admin invoice modal.
 * Returns null if not found or not authorized.
 */
export async function getOrderForAdminView(orderId: string) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado", order: null };
  const order = await getOrderByIdForAdmin(restaurantId, orderId);
  if (!order) return { error: "Orden no encontrada", order: null };
  return { order };
}

/** Payload for updating an existing line item (quantity 0 = remove). */
export type OrderItemUpdate = { id: string; quantity: number; notes?: string | null };

/** Payload for adding a new line item. */
export type OrderItemCreate = {
  menuItemId: string;
  nameSnapshot: string;
  unitPriceCentsSnapshot: number;
  quantity: number;
  notes?: string | null;
};

function isItemUpdate(i: OrderItemUpdate | OrderItemCreate): i is OrderItemUpdate {
  return "id" in i;
}

/**
 * Admin-only: update order and its line items; recalculates totals.
 * Items: existing (id, quantity, notes) or new (menuItemId, nameSnapshot, unitPriceCentsSnapshot, quantity, notes).
 */
export async function updateOrderWithItems(params: {
  orderId: string;
  status?: "OPEN" | "PAID" | "VOID";
  notes?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  items: (OrderItemUpdate | OrderItemCreate)[];
}) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado" };

  const order = await prisma.order.findFirst({
    where: { id: params.orderId, restaurantId },
    include: { items: true, restaurant: { select: { taxRateBps: true, serviceChargeBps: true } } },
  });
  if (!order) return { error: "Orden no encontrada" };

  const updates = params.items.filter(isItemUpdate);
  const creates = params.items.filter((i): i is OrderItemCreate => !isItemUpdate(i));
  const itemIds = new Set(updates.map((i) => i.id));
  const toDelete = order.items.filter(
    (i) => !itemIds.has(i.id) || updates.find((p) => p.id === i.id)?.quantity === 0
  );
  const toUpdate = updates.filter((i) => i.quantity > 0);
  const toCreate = creates.filter((i) => i.quantity > 0);

  await prisma.$transaction(async (tx) => {
    if (toDelete.length) {
      await tx.orderItem.deleteMany({
        where: { id: { in: toDelete.map((d) => d.id) } },
      });
    }
    for (const it of toUpdate) {
      const existing = order.items.find((i) => i.id === it.id);
      if (!existing) continue;
      const lineTotalCents = existing.unitPriceCentsSnapshot * it.quantity;
      await tx.orderItem.update({
        where: { id: it.id },
        data: { quantity: it.quantity, notes: it.notes ?? null, lineTotalCents },
      });
    }
    for (const it of toCreate) {
      const lineTotalCents = it.unitPriceCentsSnapshot * it.quantity;
      await tx.orderItem.create({
        data: {
          orderId: params.orderId,
          menuItemId: it.menuItemId,
          nameSnapshot: it.nameSnapshot,
          unitPriceCentsSnapshot: it.unitPriceCentsSnapshot,
          quantity: it.quantity,
          lineTotalCents,
          notes: it.notes ?? null,
        },
      });
    }

    const remaining = await tx.orderItem.findMany({
      where: { orderId: params.orderId },
    });
    const subtotalCents = remaining.reduce((s, i) => s + i.lineTotalCents, 0);
    const { taxCents, serviceChargeCents, totalCents } = computeOrderTotalInclusive(
      subtotalCents,
      order.discountCents
    );

    await tx.order.update({
      where: { id: params.orderId },
      data: {
        subtotalCents,
        taxCents,
        serviceChargeCents,
        totalCents,
        ...(params.status != null && { status: params.status }),
        ...(params.notes !== undefined && { notes: params.notes }),
        ...(params.customerName !== undefined && { customerName: params.customerName }),
        ...(params.customerPhone !== undefined && { customerPhone: params.customerPhone }),
      },
    });
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}
