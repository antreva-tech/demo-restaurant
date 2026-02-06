/**
 * MANUAL provider: terminal capture only. No payment link, webhook, or status fetch.
 */

import type { ProviderAdapter } from "./types";

export const manualAdapter: ProviderAdapter = {
  provider: "MANUAL",
  // createPaymentLink, verifyWebhook, fetchPaymentStatus not supported
};
