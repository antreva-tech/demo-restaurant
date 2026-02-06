import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdapter } from "@/server/payments/providers/registry";
import type { PaymentProvider } from "@prisma/client";

const SEGMENT_TO_PROVIDER: Record<string, PaymentProvider> = {
  cardnet: "CARDNET",
  azul: "AZUL",
};

/**
 * POST /api/webhooks/[provider]
 * Webhook endpoint for payment providers. Verifies signature and on payment.success
 * marks Payment SUCCEEDED and Order PAID. Raw body required for signature verification.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: segment } = await params;
  const provider = SEGMENT_TO_PROVIDER[segment?.toLowerCase() ?? ""];
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const adapter = getAdapter(provider);
  if (!adapter.verifyWebhook) {
    return NextResponse.json(
      { error: "Webhook not supported for this provider" },
      { status: 501 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const integration = await prisma.paymentIntegration.findFirst({
    where: { provider, isEnabled: true },
  });
  if (!integration) {
    return NextResponse.json({ error: "No integration" }, { status: 501 });
  }

  const { decryptJson } = await import("@/lib/crypto");
  let config: unknown;
  try {
    config = decryptJson(integration.configEncrypted);
  } catch {
    return NextResponse.json({ error: "Config error" }, { status: 501 });
  }

  const fakeRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: rawBody,
  });
  let result: { ok: boolean; event?: unknown };
  try {
    result = await adapter.verifyWebhook(config, fakeRequest);
  } catch {
    return NextResponse.json(
      { error: "Webhook verification failed" },
      { status: 501 }
    );
  }

  if (!result.ok) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const event = result.event as { type?: string; paymentId?: string; externalId?: string } | undefined;
  if (event?.type === "payment.success" || event?.externalId) {
    const externalId = event?.externalId ?? (event as { data?: { externalId?: string } })?.data?.externalId;
    if (externalId) {
      const payment = await prisma.payment.findFirst({
        where: { externalId, restaurantId: integration.restaurantId },
        include: { order: true },
      });
      if (payment && payment.status !== "SUCCEEDED") {
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
      }
    }
  }

  return new NextResponse(null, { status: 200 });
}
