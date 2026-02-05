import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOrdersForAdmin } from "@/server/queries/orders";
import { getLocationsForAdmin } from "@/server/queries/admin";
import { Card } from "@/components/ui/Card";
import { formatDOP } from "@/lib/money";
import { OrdersToolbar } from "@/components/admin/OrdersToolbar";
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
      <h1 className="text-2xl font-semibold text-gray-900">Órdenes</h1>
      <Card>
        <Suspense fallback={null}>
          <OrdersToolbar
            locationId={params.locationId}
            locations={locations}
          />
        </Suspense>
        {orders.length === 0 ? (
          <p className="text-gray-500">No hay órdenes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-gray-600">
                  <th className="pb-2 pr-4">ID</th>
                  <th className="pb-2 pr-4">Fecha</th>
                  <th className="pb-2 pr-4">Ubicación</th>
                  <th className="pb-2 pr-4">Origen</th>
                  <th className="pb-2 pr-4">Cliente</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Pago</th>
                  <th className="pb-2 pr-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">{o.id.slice(0, 8)}</td>
                    <td className="py-2 pr-4 text-gray-600">
                      {new Date(o.createdAt).toLocaleString("es-DO")}
                    </td>
                    <td className="py-2 pr-4">{o.location?.name ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {o.employee?.name === "Online"
                        ? "Online"
                        : o.employee
                          ? `${o.employee.name}${o.employee.employeeNumber ? ` (${o.employee.employeeNumber})` : ""}`
                          : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {o.employee?.name === "Online" && (o.customerName || o.customerPhone)
                        ? [o.customerName, o.customerPhone].filter(Boolean).join(" · ")
                        : "—"}
                    </td>
                    <td className="py-2 pr-4">{formatDOP(o.totalCents)}</td>
                    <td className="py-2 pr-4">{o.paymentMethod ?? "—"}</td>
                    <td className="py-2 pr-4">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
