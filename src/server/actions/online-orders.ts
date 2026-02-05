"use server";

import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";
import { computeOrderTotalInclusive } from "@/lib/money";
import { revalidatePath } from "next/cache";
import { getNextOrderNumber } from "@/server/actions/orders";

/** System email for the "Online" order user; unique per restaurant. */
const onlineUserEmail = (restaurantId: string) => `online-${restaurantId}@system`;

/**
 * Returns the "Online" system user for the restaurant, creating it if missing.
 * Used as employeeId for web orders; not used for login.
 */
async function getOrCreateOnlineUser(restaurantId: string) {
  let user = await prisma.user.findFirst({
    where: { restaurantId, name: "Online" },
  });
  if (user) return user;
  const email = onlineUserEmail(restaurantId);
  return prisma.user.upsert({
    where: { email },
    create: {
      restaurantId,
      name: "Online",
      email,
      passwordHash: await bcrypt.hash("no-login-system-user", 10),
      role: Role.EMPLOYEE,
      isActive: true,
      employeeNumber: "0000",
    },
    update: {},
  });
}

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
}): Promise<{ ok: true; orderId: string; orderNumber: number } | { error: string }> {
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

  const onlineUser = await getOrCreateOnlineUser(restaurant.id);

  const orderItems = items.map((i) => ({
    menuItemId: i.menuItemId,
    nameSnapshot: i.name,
    unitPriceCentsSnapshot: i.unitPriceCents,
    quantity: i.quantity,
    lineTotalCents: i.unitPriceCents * i.quantity,
  }));

  const subtotalCents = orderItems.reduce((s, i) => s + i.lineTotalCents, 0);
  const { taxCents, serviceChargeCents, totalCents } = computeOrderTotalInclusive(subtotalCents, 0);

  const order = await prisma.$transaction(async (tx) => {
    const orderNumber = await getNextOrderNumber(tx, restaurant.id);
    return tx.order.create({
      data: {
        restaurantId: restaurant.id,
        locationId: location.id,
        employeeId: onlineUser.id,
        orderNumber,
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
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin");

  const notificationPayload = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    restaurantName: restaurant.name,
    locationName: location.name,
    customerName: name,
    customerPhone: phone,
    notes: notes?.trim() || null,
    items: orderItems,
    totalCents,
  };

  await notifyOrderCreated(notificationPayload);
  await sendWhatsAppOrderNotification(notificationPayload);

  return { ok: true, orderId: order.id, orderNumber: order.orderNumber };
}

/**
 * Notifies the business of a new online order. Uses Resend if RESEND_API_KEY and NOTIFICATION_EMAIL are set.
 */
async function notifyOrderCreated(payload: {
  orderId: string;
  orderNumber: number;
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
    `Nuevo pedido en línea #${payload.orderNumber}`,
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

/**
 * Sends the order summary to the restaurant via WhatsApp (Twilio).
 * No-op if TWILIO_* or NOTIFICATION_WHATSAPP_TO are not set.
 */
async function sendWhatsAppOrderNotification(payload: {
  orderNumber: number;
  restaurantName: string;
  locationName: string;
  customerName: string;
  customerPhone: string;
  notes: string | null;
  items: { nameSnapshot: string; quantity: number; lineTotalCents: number }[];
  totalCents: number;
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  const toRaw = process.env.NOTIFICATION_WHATSAPP_TO?.trim();
  if (!accountSid || !authToken || !from || !toRaw) return;

  const to = toRaw.startsWith("whatsapp:") ? toRaw : `whatsapp:+${toRaw.replace(/\D/g, "")}`;
  const fromNorm = from.startsWith("whatsapp:") ? from : `whatsapp:+${from.replace(/\D/g, "")}`;

  const lines = [
    `🛒 *Nuevo pedido #${payload.orderNumber}*`,
    "",
    `📍 ${payload.restaurantName} · ${payload.locationName}`,
    `👤 ${payload.customerName}`,
    `📞 ${payload.customerPhone}`,
    payload.notes ? `📝 ${payload.notes}` : null,
    "",
    "Pedido:",
    ...payload.items.map(
      (i) => `  • ${i.quantity}x ${i.nameSnapshot} — ${(i.lineTotalCents / 100).toFixed(2)} DOP`
    ),
    "",
    `*Total: ${(payload.totalCents / 100).toFixed(2)} DOP*`,
  ].filter(Boolean);

  const body = lines.join("\n");

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: fromNorm,
        Body: body,
      }).toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn("Twilio WhatsApp failed:", res.status, err);
    }
  } catch (e) {
    console.warn("WhatsApp order notification failed:", e);
  }
}
