/**
 * Payment provider adapter interfaces.
 * Used by registry and adapters; PaymentStatus aligned with Prisma enum.
 */

import type { PaymentStatus } from "@prisma/client";

export interface PaymentLinkCreateInput {
  restaurantId: string;
  locationId: string;
  orderId: string;
  amountCents: number;
  currency: string;
  customerLabel?: string;
}

export interface PaymentLinkCreateResult {
  externalId: string;
  url: string;
  raw?: unknown;
}

export interface WebhookVerifyResult {
  ok: boolean;
  event?: unknown;
}

export interface PaymentStatusResult {
  status: PaymentStatus;
  raw?: unknown;
}

export interface ProviderAdapter {
  provider: "CARDNET" | "AZUL" | "MANUAL";
  createPaymentLink?: (
    config: unknown,
    input: PaymentLinkCreateInput
  ) => Promise<PaymentLinkCreateResult>;
  verifyWebhook?: (config: unknown, request: Request) => Promise<WebhookVerifyResult>;
  fetchPaymentStatus?: (
    config: unknown,
    externalId: string
  ) => Promise<PaymentStatusResult>;
}
