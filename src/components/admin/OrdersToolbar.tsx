"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrdersCsv } from "@/server/actions/orders-export";
import { Button } from "@/components/ui/Button";

interface OrdersToolbarProps {
  locationId?: string;
  locations: { id: string; name: string }[];
}

export function OrdersToolbar({ locationId, locations }: OrdersToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [exporting, setExporting] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) params.set("search", search.trim());
    else params.delete("search");
    router.push(`/admin/orders?${params.toString()}`);
  }

  async function handleExport() {
    setExporting(true);
    const params = new URLSearchParams(searchParams.toString());
    const res = await getOrdersCsv({
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      locationId: params.get("locationId") ?? undefined,
      search: params.get("search") ?? undefined,
    });
    setExporting(false);
    if (res.error) {
      alert(res.error);
      return;
    }
    const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ordenes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          placeholder="Buscar (ID, empleado, fecha)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm w-56"
        />
        <Button type="submit" size="sm">Buscar</Button>
      </form>
      <Button variant="secondary" size="sm" onClick={handleExport} disabled={exporting}>
        {exporting ? "Exportando…" : "Exportar CSV"}
      </Button>
    </div>
  );
}
