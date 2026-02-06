/**
 * Provider adapter registry and helpers for enabled integrations per restaurant/location.
 */

import { prisma } from "@/lib/db";
import type { PaymentProvider } from "@prisma/client";
import { manualAdapter } from "./manual";
import { cardnetAdapter } from "./cardnet";
import { azulAdapter } from "./azul";
import type { ProviderAdapter } from "./types";

const adapters: Record<PaymentProvider, ProviderAdapter> = {
  MANUAL: manualAdapter,
  CARDNET: cardnetAdapter,
  AZUL: azulAdapter,
};

export function getAdapter(provider: PaymentProvider): ProviderAdapter {
  const a = adapters[provider];
  if (!a) throw new Error(`Unknown payment provider: ${provider}`);
  return a;
}

export interface EnabledIntegrationsForPos {
  cardLink: { id: string; name: string; provider: PaymentProvider }[];
  terminal: { id: string; name: string; provider: PaymentProvider }[];
}

/**
 * Returns enabled integrations for the restaurant, for the given location.
 * Global (locationId null) + location-specific; for duplicates, location-specific wins.
 */
export async function getEnabledIntegrationsForPos(
  restaurantId: string,
  locationId: string
): Promise<EnabledIntegrationsForPos> {
  const all = await prisma.paymentIntegration.findMany({
    where: { restaurantId, isEnabled: true },
    select: { id: true, locationId: true, type: true, name: true, provider: true },
  });
  const global = all.filter((i) => i.locationId === null);
  const forLocation = all.filter((i) => i.locationId === locationId);
  const byType = (type: "CARD_LINK" | "TERMINAL") => {
    const locFirst = forLocation.filter((i) => i.type === type);
    const glob = global.filter((i) => i.type === type);
    const seen = new Set(locFirst.map((i) => i.id));
    const fromGlobal = glob.filter((i) => !seen.has(i.id));
    return [...locFirst, ...fromGlobal].map(({ id, name, provider }) => ({
      id,
      name,
      provider,
    }));
  };
  return {
    cardLink: byType("CARD_LINK"),
    terminal: byType("TERMINAL"),
  };
}
