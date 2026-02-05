import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRestaurantForAdmin, getLocationsForAdmin } from "@/server/queries/admin";
import { getKpis, getSalesByDay, getTopItems } from "@/server/queries/analytics";
import { Card } from "@/components/ui/Card";
import { formatDOP } from "@/lib/money";
import { DashboardCharts } from "@/components/admin/DashboardCharts";

function getDateRange(range: string): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  let from = new Date();
  from.setHours(0, 0, 0, 0);
  if (range === "today") {
    from = new Date(to);
    from.setHours(0, 0, 0, 0);
  } else if (range === "7") {
    from.setDate(from.getDate() - 7);
  } else if (range === "30") {
    from.setDate(from.getDate() - 30);
  } else if (range === "month") {
    from.setDate(1);
  } else {
    from.setDate(from.getDate() - 30);
  }
  return { from, to };
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; locationId?: string }>;
}) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) redirect("/login");

  const params = await searchParams;
  const range = params.range ?? "30";
  const locationId = params.locationId && params.locationId !== "all" ? params.locationId : undefined;
  const { from, to } = getDateRange(range);

  const [restaurant, locations, kpis, salesByDay, topItems] = await Promise.all([
    getRestaurantForAdmin(restaurantId),
    getLocationsForAdmin(restaurantId),
    getKpis(restaurantId, from, to, locationId),
    getSalesByDay(restaurantId, from, to, locationId),
    getTopItems(restaurantId, from, to, locationId),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Ventas</h1>

      <div className="flex flex-wrap gap-2">
        <a
          href="?range=today"
          className={`rounded-lg px-3 py-1.5 text-sm ${range === "today" ? "bg-antreva-blue text-white" : "bg-gray-200 text-gray-700"}`}
        >
          Hoy
        </a>
        <a
          href="?range=7"
          className={`rounded-lg px-3 py-1.5 text-sm ${range === "7" ? "bg-antreva-blue text-white" : "bg-gray-200 text-gray-700"}`}
        >
          7 días
        </a>
        <a
          href="?range=30"
          className={`rounded-lg px-3 py-1.5 text-sm ${range === "30" ? "bg-antreva-blue text-white" : "bg-gray-200 text-gray-700"}`}
        >
          30 días
        </a>
        <a
          href="?range=month"
          className={`rounded-lg px-3 py-1.5 text-sm ${range === "month" ? "bg-antreva-blue text-white" : "bg-gray-200 text-gray-700"}`}
        >
          Mes actual
        </a>
        <span className="flex items-center gap-1 text-sm">
          Ubicación:
          <a
            href={`?range=${range}&locationId=all`}
            className={`rounded px-2 py-1 ${!locationId ? "bg-antreva-blue text-white" : "text-antreva-blue hover:underline"}`}
          >
            Todas
          </a>
          {locations.map((loc) => (
            <a
              key={loc.id}
              href={`?range=${range}&locationId=${loc.id}`}
              className={`rounded px-2 py-1 ${locationId === loc.id ? "bg-antreva-blue text-white" : "text-antreva-blue hover:underline"}`}
            >
              {loc.name}
            </a>
          ))}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-gray-500">Ventas totales</p>
          <p className="text-2xl font-semibold text-antreva-navy">{formatDOP(kpis.totalCents)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Órdenes</p>
          <p className="text-2xl font-semibold text-antreva-navy">{kpis.orderCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Ticket promedio</p>
          <p className="text-2xl font-semibold text-antreva-navy">{formatDOP(kpis.ticketPromedioCents)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">% pagos en efectivo</p>
          <p className="text-2xl font-semibold text-antreva-navy">{kpis.cashPct}%</p>
        </Card>
      </div>

      <Card title="Ventas por día">
        <DashboardCharts salesByDay={salesByDay} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Top 10 productos (cantidad)">
          <ul className="space-y-2 text-sm">
            {topItems.byQuantity.map((i, idx) => (
              <li key={idx} className="flex justify-between">
                <span>{i.name}</span>
                <span>{i.quantity} — {formatDOP(i.revenueCents)}</span>
              </li>
            ))}
            {topItems.byQuantity.length === 0 && <p className="text-gray-500">Sin datos</p>}
          </ul>
        </Card>
        <Card title="Top 10 productos (ingresos)">
          <ul className="space-y-2 text-sm">
            {topItems.byRevenue.map((i, idx) => (
              <li key={idx} className="flex justify-between">
                <span>{i.name}</span>
                <span>{formatDOP(i.revenueCents)}</span>
              </li>
            ))}
            {topItems.byRevenue.length === 0 && <p className="text-gray-500">Sin datos</p>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
