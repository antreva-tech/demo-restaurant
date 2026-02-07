"use client";

import { useState, useEffect, useCallback } from "react";
import { getOpenOrdersForPosAction } from "@/server/actions/pos";
import { formatDOP } from "@/lib/money";
import { Button } from "@/components/ui/Button";

/** Open order as returned from getOpenOrdersForPos (with items). */
export type OpenOrderForPos = {
  id: string;
  orderNumber: number;
  customerName: string | null;
  customerPhone: string | null;
  totalCents: number;
  createdAt: Date;
  items: { id: string; nameSnapshot: string; quantity: number; lineTotalCents: number }[];
};

interface PosUnpaidOrdersPanelProps {
  locationId: string;
  onSelectOrder: (order: OpenOrderForPos) => void;
  onClose: () => void;
  /** Call when list should be refetched (e.g. after paying an order). */
  refreshTrigger?: number;
}

/**
 * Panel listing OPEN orders for the current location with search by customer name.
 * Clicking a row calls onSelectOrder(order) so the parent can show payment options.
 */
export function PosUnpaidOrdersPanel({
  locationId,
  onSelectOrder,
  onClose,
  refreshTrigger = 0,
}: PosUnpaidOrdersPanelProps) {
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<OpenOrderForPos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getOpenOrdersForPosAction(locationId, search.trim() || undefined);
    if ("error" in res) {
      setError(res.error ?? "Error");
      setOrders([]);
    } else {
      setOrders(
        res.orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          totalCents: o.totalCents,
          createdAt: o.createdAt,
          items: o.items,
        }))
      );
    }
    setLoading(false);
  }, [locationId, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, refreshTrigger]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded-lg border shadow">
      <div className="shrink-0 flex items-center justify-between gap-2 p-3 border-b">
        <h2 className="text-lg font-semibold text-antreva-navy">Órdenes por cobrar</h2>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      <div className="shrink-0 p-3 border-b">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre del cliente"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400"
          aria-label="Buscar por nombre"
        />
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-3">
        {loading && <p className="text-gray-600 text-sm">Cargando…</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {!loading && !error && orders.length === 0 && (
          <p className="text-gray-600 text-sm">No hay órdenes por cobrar.</p>
        )}
        {!loading && !error && orders.length > 0 && (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => onSelectOrder(o)}
                  className="w-full text-left rounded-lg border border-gray-200 p-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-antreva-blue"
                >
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="font-medium text-gray-900">#{o.orderNumber}</span>
                    <span className="text-antreva-navy font-semibold">{formatDOP(o.totalCents)}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-0.5">
                    {o.customerName || "—"} · {new Date(o.createdAt).toLocaleString()}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
