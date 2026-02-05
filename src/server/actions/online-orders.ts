"use server";

import { prisma } from "@/lib/db";
import { computeOrderTotals } from "@/lib/money";
import { revalidatePath } from "next/cache";

export interface CreateOnlineOrderItem {
  menuItemId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

/**
 * Creates an OPEN order for online (web) customers. No auth.
 * Uses the "Online" system user as employeeId. Notifies business if configured.
 */
export async function createOnlineOrder(params: {
  restaurantSlug: string;
  locationSlug: string;
  items: CreateOnlineOrderItem[];
  customerName: string;
  customerPhone: string;
  notes?: string | null;
}): Promise<{ ok: true; orderId: string } | { error: string }> {
  const { restaurantSlug, locationSlug, items, customerName, customerPhone, notes } = params;

  if (!items.length) return { error: "El carrito está vacío" };
  const name = customerName?.trim();
  const phone = customerPhone?.trim();
  if (!name) return { error: "El nombre es obligatorio" };
  if (!phone) return { error: "El teléfono es obligatorio" };

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: restaurantSlug },
  });
  if (!restaurant) return { error: "Restaurante no encontrado" };

  const location = await prisma.location.findFirst({
    where: { restaurantId: restaurant.id, slug: locationSlug, isActive: true },
  });
  if (!location) return { error: "Ubicación no encontrada" };

  const onlineUser = await prisma.user.findFirst({
    where: { restaurantId: restaurant.id, name: "Online" },
  });
  if (!onlineUser) return { error: "Configuración del restaurante incompleta" };

  const orderItems = items.map((i) => ({
    menuItemId: i.menuItemId,
    nameSnapshot: i.name,
    unitPriceCentsSnapshot: i.unitPriceCents,
    quantity: i.quantity,
    lineTotalCents: i.unitPriceCents * i.quantity,
  }));

  const subtotalCents = orderItems.reduce((s, i) => s + i.lineTotalCents, 0);
  const { taxCents, serviceChargeCents, totalCents } = computeOrderTotals(
    subtotalCents,
    restaurant.taxRateBps,
    restaurant.serviceChargeBps,
    0
  );

  const order = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      locationId: location.id,
      employeeId: onlineUser.id,
      status: "OPEN",
      notes: notes?.trim() || null,
      customerName: name,
      customerPhone: phone,
      subtotalCents,
      taxCents,
      serviceChargeCents,
      discountCents: 0,
      totalCents,
      items: {
        create: orderItems.map((i) => ({
          menuItemId: i.menuItemId,
          nameSnapshot: i.nameSnapshot,
          unitPriceCentsSnapshot: i.unitPriceCentsSnapshot,
          quantity: i.quantity,
          lineTotalCents: i.lineTotalCents,
          notes: null,
        })),
      },
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin");

  await notifyOrderCreated({
    orderId: order.id,
    restaurantName: restaurant.name,
    locationName: location.name,
    customerName: name,
    customerPhone: phone,
    notes: notes?.trim() || null,
    items: orderItems,
    totalCents,
  });

  return { ok: true, orderId: order.id };
}

/**
 * Notifies the business of a new online order. Uses Resend if RESEND_API_KEY and NOTIFICATION_EMAIL are set.
 */
async function notifyOrderCreated(payload: {
  orderId: string;
  restaurantName: string;
  locationName: string;
  customerName: string;
  customerPhone: string;
  notes: string | null;
  items: { nameSnapshot: string; quantity: number; lineTotalCents: number }[];
  totalCents: number;
}) {
  const email = process.env.NOTIFICATION_EMAIL?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();

  const lines = [
    `Nuevo pedido en línea #${payload.orderId.slice(0, 8)}`,
    "",
    `Restaurante: ${payload.restaurantName}`,
    `Ubicación: ${payload.locationName}`,
    `Cliente: ${payload.customerName}`,
    `Teléfono: ${payload.customerPhone}`,
    payload.notes ? `Notas: ${payload.notes}` : null,
    "",
    "Ítems:",
    ...payload.items.map(
      (i) => `  ${i.quantity}x ${i.nameSnapshot} - ${(i.lineTotalCents / 100).toFixed(2)} DOP`
    ),
    "",
    `Total: ${(payload.totalCents / 100).toFixed(2)} DOP`,
  ].filter(Boolean);

  const text = lines.join("\n");

  if (resendKey && email) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev",
          to: email,
          subject: `[${payload.restaurantName}] Nuevo pedido en línea`,
          text,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.warn("Resend email failed:", res.status, err);
      }
    } catch (e) {
      console.warn("Notify order created failed:", e);
    }
  } else {
    console.info("Online order created (no email sent):", text);
  }
}
