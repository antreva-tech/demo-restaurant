"use client";

import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import { formatDOP } from "@/lib/money";
import { DashboardCharts } from "@/components/admin/DashboardCharts";

/** Dashboard API response shape */
interface DashboardData {
  locations: { id: string; name: string }[];
  kpis: {
    totalCents: number;
    orderCount: number;
    ticketPromedioCents: number;
    cashPct: number;
  };
  salesByDay: { date: string; totalCents: number }[];
  topItems: {
    byQuantity: { name: string; quantity: number; revenueCents: number }[];
    byRevenue: { name: string; quantity: number; revenueCents: number }[];
  };
}

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error("Unauthorized"))));

/**
 * Client-side admin dashboard. Uses SWR keyed by range + locationId so
 * switching filters reuses cache when the same filter was already loaded (no extra API/DB hit).
 */
export function DashboardOverview() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const range = searchParams.get("range") ?? "30";
  const locationIdParam = searchParams.get("locationId") ?? "all";
  const locationId = locationIdParam !== "all" ? locationIdParam : undefined;

  const url = `/api/admin/dashboard?range=${range}&locationId=${locationIdParam}`;
  const { data, error, isLoading } = useSWR<DashboardData>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
  });

  const setFilters = (newRange: string, newLocationId: string) => {
    const params = new URLSearchParams();
    params.set("range", newRange);
    params.set("locationId", newLocationId);
    router.push(`/admin?${params.toString()}`, { scroll: false });
  };

  if (error) {
    return (
      <div className="text-antreva-navy">
        No se pudo cargar el panel. Verifica tu sesión.
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-antreva-navy">Ventas</h1>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm text-gray-500">Hoy</span>
          <span className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm text-gray-500">7 días</span>
          <span className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm text-gray-500">30 días</span>
          <span className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm text-gray-500">Mes actual</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
              <div className="mt-2 h-10 w-24 animate-pulse rounded bg-gray-200" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { locations, kpis, salesByDay, topItems } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-antreva-navy">Ventas</h1>

      <div className="flex flex-wrap gap-2">
        {[
          ["today", "Hoy"],
          ["7", "7 días"],
          ["30", "30 días"],
          ["month", "Mes actual"],
        ].map(([r, label]) => (
          <button
            key={r}
            type="button"
            onClick={() => setFilters(r, locationIdParam)}
            className={`rounded-lg px-3 py-1.5 text-sm ${range === r ? "bg-antreva-blue text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
          >
            {label}
          </button>
        ))}
        <span className="flex items-center gap-1 text-sm text-antreva-navy">
          Ubicación:
          <button
            type="button"
            onClick={() => setFilters(range, "all")}
            className={`rounded px-2 py-1 ${!locationId ? "bg-antreva-blue text-white" : "text-antreva-blue hover:underline"}`}
          >
            Todas
          </button>
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => setFilters(range, loc.id)}
              className={`rounded px-2 py-1 ${locationId === loc.id ? "bg-antreva-blue text-white" : "text-antreva-blue hover:underline"}`}
            >
              {loc.name}
            </button>
          ))}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm font-medium text-antreva-navy">Ventas totales</p>
          <p className="text-2xl font-semibold text-antreva-navy">{formatDOP(kpis.totalCents)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-antreva-navy">Órdenes</p>
          <p className="text-2xl font-semibold text-antreva-navy">{kpis.orderCount}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-antreva-navy">Ticket promedio</p>
          <p className="text-2xl font-semibold text-antreva-navy">{formatDOP(kpis.ticketPromedioCents)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-antreva-navy">% pagos en efectivo</p>
          <p className="text-2xl font-semibold text-antreva-navy">{kpis.cashPct}%</p>
        </Card>
      </div>

      <Card title="Ventas por día">
        <DashboardCharts salesByDay={salesByDay} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Top 10 productos (cantidad)">
          <ul className="space-y-2 text-sm text-antreva-navy">
            {topItems.byQuantity.map((i, idx) => (
              <li key={idx} className="flex justify-between">
                <span>{i.name}</span>
                <span>{i.quantity} — {formatDOP(i.revenueCents)}</span>
              </li>
            ))}
            {topItems.byQuantity.length === 0 && <p className="text-antreva-slate">Sin datos</p>}
          </ul>
        </Card>
        <Card title="Top 10 productos (ingresos)">
          <ul className="space-y-2 text-sm text-antreva-navy">
            {topItems.byRevenue.map((i, idx) => (
              <li key={idx} className="flex justify-between">
                <span>{i.name}</span>
                <span>{formatDOP(i.revenueCents)}</span>
              </li>
            ))}
            {topItems.byRevenue.length === 0 && <p className="text-antreva-slate">Sin datos</p>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
