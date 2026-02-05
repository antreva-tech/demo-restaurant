"use server";

import { auth } from "@/lib/auth";
import { getOrdersForAdmin } from "@/server/queries/orders";
import { formatDOP } from "@/lib/money";

export async function getOrdersCsv(params: {
  from?: string;
  to?: string;
  locationId?: string;
  search?: string;
}): Promise<{ csv: string; error?: string }> {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { csv: "", error: "No autorizado" };

  const opts: { from?: Date; to?: Date; locationId?: string } = {};
  if (params.from) opts.from = new Date(params.from);
  if (params.to) opts.to = new Date(params.to);
  if (params.locationId && params.locationId !== "all") opts.locationId = params.locationId;

  const ordersRaw = await getOrdersForAdmin(restaurantId, opts);
  type Row = (typeof ordersRaw)[number] & {
    location?: { name: string };
    employee?: { name: string; employeeNumber?: string | null };
  };
  let orders = ordersRaw as Row[];

  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    orders = orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.employee?.name?.toLowerCase().includes(q) ?? false) ||
        (o.employee?.employeeNumber?.toLowerCase().includes(q) ?? false) ||
        o.createdAt.toISOString().toLowerCase().includes(q)
    );
  }

  const headers = [
    "id",
    "fecha",
    "ubicación",
    "empleado",
    "total",
    "método_pago",
    "estado",
  ].join(",");
  const rows = orders.map((o) =>
    [
      o.id,
      o.createdAt.toISOString(),
      o.location?.name ?? "",
      `${o.employee?.name ?? ""} ${o.employee?.employeeNumber ?? ""}`.trim(),
      o.totalCents / 100,
      o.paymentMethod ?? "",
      o.status,
    ].join(",")
  );
  const csv = [headers, ...rows].join("\n");
  return { csv };
}
