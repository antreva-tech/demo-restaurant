import { prisma } from "@/lib/db";

export async function getKpis(
  restaurantId: string,
  from: Date,
  to: Date,
  locationId?: string
) {
  const where: { restaurantId: string; status: "PAID"; locationId?: string; paidAt: { gte: Date; lte: Date } } = {
    restaurantId,
    status: "PAID",
    paidAt: { gte: from, lte: to },
  };
  if (locationId) where.locationId = locationId;

  const orders = await prisma.order.findMany({
    where,
    select: { totalCents: true, paymentMethod: true },
  });

  const totalCents = orders.reduce((s, o) => s + o.totalCents, 0);
  const count = orders.length;
  const ticketPromedio = count > 0 ? Math.round(totalCents / count) : 0;
  const cashCount = orders.filter((o) => o.paymentMethod === "CASH").length;
  const cashPct = count > 0 ? Math.round((cashCount / count) * 100) : 0;

  return {
    totalCents,
    orderCount: count,
    ticketPromedioCents: ticketPromedio,
    cashPct,
  };
}

export async function getSalesByDay(
  restaurantId: string,
  from: Date,
  to: Date,
  locationId?: string
) {
  const where: { restaurantId: string; status: "PAID"; locationId?: string; paidAt: { gte: Date; lte: Date } } = {
    restaurantId,
    status: "PAID",
    paidAt: { gte: from, lte: to },
  };
  if (locationId) where.locationId = locationId;

  const orders = await prisma.order.findMany({
    where,
    select: { paidAt: true, totalCents: true },
  });

  const byDay = new Map<string, number>();
  for (const o of orders) {
    if (!o.paidAt) continue;
    const key = o.paidAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + o.totalCents);
  }
  const sorted = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([date, totalCents]) => ({ date, totalCents }));
}

export async function getTopItems(
  restaurantId: string,
  from: Date,
  to: Date,
  locationId?: string,
  limit = 10
) {
  const whereOrder: { restaurantId: string; status: "PAID"; locationId?: string; paidAt: { gte: Date; lte: Date } } = {
    restaurantId,
    status: "PAID",
    paidAt: { gte: from, lte: to },
  };
  if (locationId) whereOrder.locationId = locationId;

  const orderIds = await prisma.order.findMany({
    where: whereOrder,
    select: { id: true },
  });
  const ids = orderIds.map((o) => o.id);
  if (ids.length === 0) return { byQuantity: [], byRevenue: [] };

  const items = await prisma.orderItem.groupBy({
    by: ["nameSnapshot", "menuItemId"],
    where: { orderId: { in: ids } },
    _sum: { lineTotalCents: true },
    _count: { id: true },
  });

  const byQuantity = [...items]
    .sort((a, b) => (b._count.id ?? 0) - (a._count.id ?? 0))
    .slice(0, limit)
    .map((i) => ({ name: i.nameSnapshot, quantity: i._count.id ?? 0, revenueCents: i._sum.lineTotalCents ?? 0 }));

  const byRevenue = [...items]
    .sort((a, b) => (b._sum.lineTotalCents ?? 0) - (a._sum.lineTotalCents ?? 0))
    .slice(0, limit)
    .map((i) => ({ name: i.nameSnapshot, quantity: i._count.id ?? 0, revenueCents: i._sum.lineTotalCents ?? 0 }));

  return { byQuantity, byRevenue };
}
