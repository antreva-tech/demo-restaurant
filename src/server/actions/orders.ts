"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { computeOrderTotals } from "@/lib/money";
import type { PaymentMethod } from "@prisma/client";

export async function createOrderAndPay(params: {
  locationId: string;
  items: { menuItemId: string; nameSnapshot: string; unitPriceCentsSnapshot: number; quantity: number; lineTotalCents: number; notes?: string }[];
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
  const { taxCents, serviceChargeCents, totalCents } = computeOrderTotals(
    subtotalCents,
    restaurant.taxRateBps,
    restaurant.serviceChargeBps,
    discountCents
  );

  if (params.paymentMethod === "CASH" || params.paymentMethod === "MIXED") {
    const cash = params.cashReceivedCents ?? 0;
    if (cash < totalCents) return { error: "Efectivo recibido debe ser mayor o igual al total" };
  }

  const changeGivenCents =
    params.paymentMethod === "CASH" || params.paymentMethod === "MIXED"
      ? (params.cashReceivedCents ?? 0) - totalCents
      : null;

  const order = await prisma.order.create({
    data: {
      restaurantId,
      locationId: params.locationId,
      employeeId: userId,
      status: "PAID",
      notes: params.orderNotes ?? null,
      subtotalCents,
      taxCents,
      serviceChargeCents,
      discountCents,
      totalCents,
      paymentMethod: params.paymentMethod,
      cashReceivedCents: params.cashReceivedCents ?? null,
      changeGivenCents,
      paidAt: new Date(),
      items: {
        create: params.items.map((i) => ({
          menuItemId: i.menuItemId,
          nameSnapshot: i.nameSnapshot,
          unitPriceCentsSnapshot: i.unitPriceCentsSnapshot,
          quantity: i.quantity,
          lineTotalCents: i.lineTotalCents,
          notes: i.notes ?? null,
        })),
      },
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true, orderId: order.id };
}
