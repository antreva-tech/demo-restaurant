import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOrdersForAdmin } from "@/server/queries/orders";
import { getLocationsForAdmin } from "@/server/queries/admin";
import { Card } from "@/components/ui/Card";
import { OrdersToolbar } from "@/components/admin/OrdersToolbar";
import { OrdersTableWithModal } from "@/components/admin/OrdersTableWithModal";
import { Suspense } from "react";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; locationId?: string; search?: string }>;
}) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) redirect("/login");

  const params = await searchParams;
  const opts: { from?: Date; to?: Date; locationId?: string } = {};
  if (params.from) opts.from = new Date(params.from);
  if (params.to) opts.to = new Date(params.to);
  if (params.locationId && params.locationId !== "all") opts.locationId = params.locationId;

  const [ordersRaw, locations] = await Promise.all([
    getOrdersForAdmin(restaurantId, opts),
    getLocationsForAdmin(restaurantId),
  ]);

  type OrderRow = (typeof ordersRaw)[number] & {
    location?: { name: string };
    employee?: { name: string; employeeNumber?: string | null };
    customerName?: string | null;
    customerPhone?: string | null;
  };
  let orders = ordersRaw as OrderRow[];

  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    orders = orders.filter(
      (o) =>
        String((o as { orderNumber?: number }).orderNumber ?? "").includes(q) ||
        o.id.toLowerCase().includes(q) ||
        (o.employee?.name?.toLowerCase().includes(q) ?? false) ||
        (o.employee?.employeeNumber?.toLowerCase().includes(q) ?? false) ||
        (o.customerName?.toLowerCase().includes(q) ?? false) ||
        (o.customerPhone?.toLowerCase().includes(q) ?? false) ||
        o.createdAt.toISOString().toLowerCase().includes(q)
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-antreva-navy">Órdenes</h1>
      <Card>
        <Suspense fallback={null}>
          <OrdersToolbar
            locationId={params.locationId}
            locations={locations}
          />
        </Suspense>
        <OrdersTableWithModal orders={orders} />
      </Card>
    </div>
  );
}
