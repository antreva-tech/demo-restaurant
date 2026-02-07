"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getIntegrationConfig } from "@/server/actions/payment-integrations";
import { getAdapter } from "@/server/payments/providers/registry";

/**
 * Creates a PENDING payment and payment link for the given order and integration.
 * Returns { url, paymentId } or { error: "not_implemented" } when adapter is scaffold.
 */
export async function createPaymentLink(orderId: string, integrationId: string) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  const userId = (session?.user as { id?: string })?.id;
  if (!restaurantId || !userId) return { error: "No autorizado" };

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId, status: "OPEN" },
  });
  if (!order) return { error: "Orden no encontrada o ya pagada" };

  const configResult = await getIntegrationConfig(integrationId);
  if (!configResult) return { error: "Integración no encontrada" };
  const { config, integration } = configResult;
  if (integration.type !== "CARD_LINK") return { error: "Integración no es tipo Link/QR" };

  const adapter = getAdapter(integration.provider);
  if (!adapter.createPaymentLink) return { error: "Proveedor no soporta enlace de pago" };

  try {
    const result = await adapter.createPaymentLink(config, {
      restaurantId,
      locationId: order.locationId,
      orderId: order.id,
      amountCents: order.totalCents,
      currency: "DOP",
    });

    const payment = await prisma.payment.create({
      data: {
        restaurantId,
        locationId: order.locationId,
        orderId: order.id,
        provider: integration.provider,
        type: "CARD_LINK",
        status: "PENDING",
        amountCents: order.totalCents,
        currency: "DOP",
        externalId: result.externalId,
        externalUrl: result.url,
        metadataJson: (result.raw ?? undefined) as object | undefined,
      },
    });
    revalidatePath("/pos");
    revalidatePath("/admin/orders");
    return { ok: true, url: result.url, paymentId: payment.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("not fully implemented"))
      return { error: "not_implemented" as const };
    return { error: msg || "Error al crear enlace de pago" };
  }
}

/**
 * Polls provider for payment status; if SUCCEEDED, marks Payment and Order PAID.
 * Looks up integration by restaurantId + provider + type to get config.
 */
export async function checkPaymentStatus(paymentId: string) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado" };

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, restaurantId },
    include: { order: true },
  });
  if (!payment || !payment.externalId)
    return { error: "Pago no encontrado" };
  if (payment.status === "SUCCEEDED")
    return { ok: true, status: "SUCCEEDED" as const };

  const integration = await prisma.paymentIntegration.findFirst({
    where: {
      restaurantId,
      provider: payment.provider,
      type: payment.type,
      isEnabled: true,
    },
  });
  if (!integration) return { error: "Integración no disponible" };

  const configResult = await getIntegrationConfig(integration.id);
  if (!configResult) return { error: "Config no disponible" };

  const adapter = getAdapter(payment.provider);
  if (!adapter.fetchPaymentStatus) return { error: "Proveedor no soporta consulta de estado" };

  try {
    const result = await adapter.fetchPaymentStatus(configResult.config, payment.externalId);
    if (result.status === "SUCCEEDED") {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "SUCCEEDED", succeededAt: new Date() },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { status: "PAID", paidAt: new Date(), paymentChannel: "CARD", paymentMethod: "CARD" },
        }),
      ]);
      revalidatePath("/pos");
      revalidatePath("/admin/orders");
      revalidatePath("/admin");
      return { ok: true, status: "SUCCEEDED" as const };
    }
    return { ok: true, status: result.status };
  } catch {
    return { error: "Error al consultar estado" };
  }
}

/**
 * Manual terminal capture: set Payment SUCCEEDED and Order PAID (CARD).
 */
export async function confirmTerminalPayment(
  orderId: string,
  integrationId: string,
  params: { approvalCode: string; last4?: string }
) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado" };

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId, status: "OPEN" },
  });
  if (!order) return { error: "Orden no encontrada o ya pagada" };

  const configResult = await getIntegrationConfig(integrationId);
  if (!configResult) return { error: "Integración no encontrada" };
  const { integration } = configResult;
  if (integration.type !== "TERMINAL") return { error: "Integración no es tipo Terminal" };

  const approvalCode = params.approvalCode?.trim();
  if (!approvalCode) return { error: "Código de aprobación es requerido" };

  const existing = await prisma.payment.findUnique({ where: { orderId } });
  if (existing) {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: existing.id },
        data: {
          status: "SUCCEEDED",
          succeededAt: new Date(),
          approvalCode,
          last4: params.last4?.trim().slice(-4) ?? null,
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID", paidAt: new Date(), paymentChannel: "CARD", paymentMethod: "CARD" },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          restaurantId,
          locationId: order.locationId,
          orderId: order.id,
          provider: integration.provider,
          type: "TERMINAL",
          status: "SUCCEEDED",
          amountCents: order.totalCents,
          currency: "DOP",
          approvalCode,
          last4: params.last4?.trim().slice(-4) ?? null,
          succeededAt: new Date(),
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID", paidAt: new Date(), paymentChannel: "CARD", paymentMethod: "CARD" },
      }),
    ]);
  }
  revalidatePath("/pos");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Transfer payment: create Payment (SUCCEEDED) and set Order PAID (TRANSFER).
 */
export async function completeTransferPayment(
  orderId: string,
  reference?: string
) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado" };

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId, status: "OPEN" },
  });
  if (!order) return { error: "Orden no encontrada o ya pagada" };

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        restaurantId,
        locationId: order.locationId,
        orderId: order.id,
        provider: "MANUAL",
        type: "TERMINAL",
        status: "SUCCEEDED",
        amountCents: order.totalCents,
        currency: "DOP",
        succeededAt: new Date(),
        metadataJson: reference ? { reference } : undefined,
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { status: "PAID", paidAt: new Date(), paymentChannel: "TRANSFER", paymentMethod: "TRANSFER" },
    }),
  ]);
  revalidatePath("/pos");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Marks an existing OPEN order as PAID with cash (no Payment record; consistent with createOrderAndPay).
 * Used when collecting payment for an order saved via "Cobrar después".
 */
export async function payOpenOrderWithCash(orderId: string, cashReceivedCents: number) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado" };

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId, status: "OPEN" },
  });
  if (!order) return { error: "Orden no encontrada o ya pagada" };

  if (cashReceivedCents < order.totalCents)
    return { error: "Efectivo recibido debe ser mayor o igual al total" };

  const changeGivenCents = cashReceivedCents - order.totalCents;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      paymentMethod: "CASH",
      paymentChannel: "CASH",
      cashReceivedCents,
      changeGivenCents,
      paidAt: new Date(),
    },
  });
  revalidatePath("/pos");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}
