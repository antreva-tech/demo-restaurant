/**
 * Money in centavos (DOP * 100). All amounts stored and computed as integers.
 */

/**
 * Format amount in centavos as DOP for es-DO.
 */
export function formatDOP(centavos: number): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

/**
 * Compute percentage of amount using basis points (bps). 10000 bps = 100%.
 * Uses Math.round for rounding.
 */
export function percentBps(amountCents: number, bps: number): number {
  if (bps === 0) return 0;
  return Math.round((amountCents * bps) / 10000);
}

/**
 * Order totals: taxCents = percentBps(subtotalCents, taxRateBps),
 * serviceChargeCents = percentBps(subtotalCents, serviceChargeBps),
 * totalCents = subtotalCents + taxCents + serviceChargeCents - discountCents.
 */
export function computeOrderTotals(
  subtotalCents: number,
  taxRateBps: number,
  serviceChargeBps: number,
  discountCents: number = 0
): { taxCents: number; serviceChargeCents: number; totalCents: number } {
  const taxCents = percentBps(subtotalCents, taxRateBps);
  const serviceChargeCents = percentBps(subtotalCents, serviceChargeBps);
  const totalCents = subtotalCents + taxCents + serviceChargeCents - discountCents;
  return { taxCents, serviceChargeCents, totalCents };
}

/**
 * Order total when prices already include tax (no extra tax or service added).
 * totalCents = subtotalCents - discountCents. Used so displayed total equals sum of line items minus discount.
 */
export function computeOrderTotalInclusive(
  subtotalCents: number,
  discountCents: number = 0
): { taxCents: number; serviceChargeCents: number; totalCents: number } {
  return {
    taxCents: 0,
    serviceChargeCents: 0,
    totalCents: Math.max(0, subtotalCents - discountCents),
  };
}
