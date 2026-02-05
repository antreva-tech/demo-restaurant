"use client";

import { useState, useEffect } from "react";
import { getPosMenu } from "@/server/actions/pos";
import { createOrderAndPay } from "@/server/actions/orders";
import { formatDOP, computeOrderTotals } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Category, MenuItem, Location } from "@prisma/client";

export interface OrderLine {
  menuItemId: string;
  nameSnapshot: string;
  unitPriceCentsSnapshot: number;
  quantity: number;
  lineTotalCents: number;
  notes?: string;
}

interface PosBuilderProps {
  locations: Location[];
  restaurant: { taxRateBps: number; serviceChargeBps: number };
}

export function PosBuilder({ locations, restaurant }: PosBuilderProps) {
  const [locationId, setLocationId] = useState<string>(locations[0]?.id ?? "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderLine[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "TRANSFER" | "MIXED">("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    if (!locationId) return;
    setLoading(true);
    getPosMenu(locationId).then((res) => {
      if ("categories" in res) {
        setCategories(res.categories);
        setItems(res.items);
      }
      setLoading(false);
    });
  }, [locationId]);

  function addItem(item: MenuItem) {
    if (!item.isAvailable) return;
    setOrder((prev) => {
      const i = prev.findIndex((l) => l.menuItemId === item.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = {
          ...next[i],
          quantity: next[i].quantity + 1,
          lineTotalCents: (next[i].quantity + 1) * next[i].unitPriceCentsSnapshot,
        };
        return next;
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          nameSnapshot: item.name,
          unitPriceCentsSnapshot: item.priceCents,
          quantity: 1,
          lineTotalCents: item.priceCents,
        },
      ];
    });
  }

  function updateQty(index: number, delta: number) {
    setOrder((prev) => {
      const next = [...prev];
      const n = next[index];
      const q = Math.max(0, n.quantity + delta);
      if (q === 0) {
        next.splice(index, 1);
        return next;
      }
      next[index] = { ...n, quantity: q, lineTotalCents: n.unitPriceCentsSnapshot * q };
      return next;
    });
  }

  const subtotalCents = order.reduce((s, l) => s + l.lineTotalCents, 0);
  const { taxCents, serviceChargeCents, totalCents } = computeOrderTotals(
    subtotalCents,
    restaurant.taxRateBps,
    restaurant.serviceChargeBps,
    0
  );
  const cashReceivedCents = Math.round(parseFloat(cashReceived || "0") * 100);
  const changeCents = (paymentMethod === "CASH" || paymentMethod === "MIXED") ? Math.max(0, cashReceivedCents - totalCents) : 0;

  async function handlePay() {
    if (order.length === 0) return;
    if ((paymentMethod === "CASH" || paymentMethod === "MIXED") && cashReceivedCents < totalCents) {
      alert("Efectivo recibido debe ser mayor o igual al total.");
      return;
    }
    setPayLoading(true);
    const res = await createOrderAndPay({
      locationId,
      items: order,
      orderNotes: orderNotes || undefined,
      paymentMethod,
      cashReceivedCents: paymentMethod === "CASH" || paymentMethod === "MIXED" ? cashReceivedCents : undefined,
    });
    setPayLoading(false);
    if (res?.ok) {
      setOrder([]);
      setOrderNotes("");
      setCheckoutOpen(false);
      setCashReceived("");
    } else {
      alert((res as { error?: string })?.error ?? "Error al guardar");
    }
  }

  const itemsByCategory = categories.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.categoryId === cat.id && i.isAvailable),
  }));

  return (
    <div className="flex flex-1 gap-4 overflow-hidden p-4">
      <div className="flex flex-1 flex-col overflow-hidden">
        {locations.length > 1 && (
          <div className="mb-2">
            <label className="mr-2 text-sm text-gray-600">Ubicación:</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
        )}
        {loading ? (
          <p className="text-gray-500">Cargando menú…</p>
        ) : (
          <div className="flex-1 overflow-auto rounded-lg border bg-white p-4">
            {itemsByCategory.map(({ category, items: catItems }) => (
              <div key={category.id} className="mb-6">
                <h2 className="mb-2 text-lg font-semibold text-gray-900">{category.name}</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {catItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addItem(item)}
                      className="rounded-lg border bg-gray-50 p-3 text-left transition hover:bg-antreva-blue hover:text-white"
                    >
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm opacity-90">{formatDOP(item.priceCents)}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex w-96 flex-col rounded-lg border bg-white shadow">
        <div className="border-b px-4 py-2 font-semibold">Orden actual</div>
        <div className="flex-1 overflow-auto p-4">
          {order.length === 0 ? (
            <p className="text-sm text-gray-500">Agregue productos</p>
          ) : (
            <ul className="space-y-2">
              {order.map((line, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{line.nameSnapshot}</div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => updateQty(i, -1)} className="rounded bg-gray-200 px-1.5 py-0.5">−</button>
                      <span>{line.quantity}</span>
                      <button type="button" onClick={() => updateQty(i, 1)} className="rounded bg-gray-200 px-1.5 py-0.5">+</button>
                    </div>
                  </div>
                  <span>{formatDOP(line.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
          )}
          <textarea
            placeholder="Notas del pedido"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            className="mt-2 w-full rounded border border-gray-300 p-2 text-sm"
            rows={2}
          />
        </div>
        <div className="border-t p-4">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatDOP(subtotalCents)}</span></div>
            <div className="flex justify-between"><span>ITBIS</span><span>{formatDOP(taxCents)}</span></div>
            {serviceChargeCents > 0 && (
              <div className="flex justify-between"><span>Servicio</span><span>{formatDOP(serviceChargeCents)}</span></div>
            )}
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatDOP(totalCents)}</span></div>
          </div>
          <Button
            className="mt-4 w-full"
            onClick={() => setCheckoutOpen(true)}
            disabled={order.length === 0}
          >
            Cobrar
          </Button>
        </div>
      </div>

      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Cobrar">
        <div className="space-y-4">
          <div className="text-lg font-semibold">Total: {formatDOP(totalCents)}</div>
          <div>
            <label className="mb-1 block text-sm font-medium">Método de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "CARD" | "TRANSFER" | "MIXED")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="CASH">Efectivo</option>
              <option value="CARD">Tarjeta</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="MIXED">Mixto</option>
            </select>
          </div>
          {(paymentMethod === "CASH" || paymentMethod === "MIXED") && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">Efectivo recibido (RD$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              {cashReceivedCents >= totalCents && (
                <p className="text-lg font-medium text-green-700">Cambio: {formatDOP(changeCents)}</p>
              )}
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCheckoutOpen(false)}>Cancelar</Button>
            <Button onClick={handlePay} disabled={payLoading || ((paymentMethod === "CASH" || paymentMethod === "MIXED") && cashReceivedCents < totalCents)}>
              {payLoading ? "Guardando…" : "Marcar como pagado"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
