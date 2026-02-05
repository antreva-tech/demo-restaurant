import { describe, it, expect } from "vitest";
import { percentBps, computeOrderTotals, formatDOP } from "./money";

describe("percentBps", () => {
  it("returns 0 when bps is 0", () => {
    expect(percentBps(10000, 0)).toBe(0);
  });
  it("computes 18% of 10000 cents", () => {
    expect(percentBps(10000, 1800)).toBe(1800);
  });
  it("rounds correctly", () => {
    expect(percentBps(100, 1800)).toBe(18);
    expect(percentBps(33, 1800)).toBe(6);
  });
});

describe("computeOrderTotals", () => {
  it("computes tax and total without discount", () => {
    const subtotal = 10000;
    const { taxCents, serviceChargeCents, totalCents } = computeOrderTotals(
      subtotal,
      1800,
      0,
      0
    );
    expect(taxCents).toBe(1800);
    expect(serviceChargeCents).toBe(0);
    expect(totalCents).toBe(11800);
  });
  it("applies discount", () => {
    const { totalCents } = computeOrderTotals(10000, 1800, 0, 500);
    expect(totalCents).toBe(11300);
  });
});

describe("formatDOP", () => {
  it("formats centavos as RD$", () => {
    expect(formatDOP(25000)).toMatch(/250/);
    expect(formatDOP(0)).toMatch(/0/);
  });
});
