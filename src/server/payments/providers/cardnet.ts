/**
 * CardNET provider scaffold. Config shape for CARD_LINK; placeholder implementations throw.
 */

import type { ProviderAdapter } from "./types";

const NOT_IMPLEMENTED = "Provider not fully implemented";

async function throwNotImplemented(): Promise<never> {
  throw new Error(NOT_IMPLEMENTED);
}

export const cardnetAdapter: ProviderAdapter = {
  provider: "CARDNET",
  createPaymentLink: async (_config: unknown, _input) => throwNotImplemented(),
  verifyWebhook: async (_config: unknown, _request) => throwNotImplemented(),
  fetchPaymentStatus: async (_config: unknown, _externalId: string) => throwNotImplemented(),
};
