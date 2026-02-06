"use client";

import { useState, useEffect } from "react";
import { getPosMenu } from "@/server/actions/pos";
import { createOrderAndPay } from "@/server/actions/orders";
import { formatDOP, computeOrderTotalInclusive } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PosItemCard } from "@/components/pos/PosItemCard";
import { DEFAULT_FOOD_IMAGE, getProductCardImageUrl } from "@/components/public/constants";
import type { Category, MenuItem, Location } from "@prisma/client";

export interface OrderLine {
  /** null = custom/off-menu item added by manager or admin. */
  menuItemId: string | null;
  nameSnapshot: string;
  unitPriceCentsSnapshot: number;
  quantity: number;
  lineTotalCents: number;
  notes?: string;
}

interface PosBuilderProps {
  locations: Location[];
  restaurant: { taxRateBps: number; serviceChargeBps: number };
  /** If true, show button to add custom item with name and price (admin/manager only). */
  canAddCustomItem?: boolean;
}

export function PosBuilder({ locations, restaurant, canAddCustomItem = false }: PosBuilderProps) {
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
  /** Menu item IDs whose order-line thumbnail failed to load; use fallback image. */
  const [failedThumbIds, setFailedThumbIds] = useState<Set<string>>(new Set());
  /** Custom item modal: open state and form (name, price in RD$ string). */
  const [customItemOpen, setCustomItemOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPriceRd, setCustomPriceRd] = useState("");

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

  /** Updates the per-line notes (e.g. "sin cebolla", "extra queso") for the given line index. */
  function updateLineNotes(index: number, notes: string) {
    setOrder((prev) => {
      const next = [...prev];
      if (index < 0 || index >= next.length) return prev;
      next[index] = { ...next[index], notes: notes.trim() || undefined };
      return next;
    });
  }

  /** Adds a custom (off-menu) line. Only used when canAddCustomItem is true. */
  function addCustomItem() {
    const name = customName.trim();
    const priceRd = parseFloat(customPriceRd.replace(",", "."));
    if (!name || Number.isNaN(priceRd) || priceRd < 0) return;
    const priceCents = Math.round(priceRd * 100);
    setOrder((prev) => [
      ...prev,
      {
        menuItemId: null,
        nameSnapshot: name,
        unitPriceCentsSnapshot: priceCents,
        quantity: 1,
        lineTotalCents: priceCents,
      },
    ]);
    setCustomName("");
    setCustomPriceRd("");
    setCustomItemOpen(false);
  }

  const subtotalCents = order.reduce((s, l) => s + l.lineTotalCents, 0);
  const { totalCents } = computeOrderTotalInclusive(subtotalCents, 0);
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

  const availableItems = items.filter((i) => i.isAvailable);

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
          <p className="text-gray-600">Cargando menú…</p>
        ) : (
          <div className="flex-1 overflow-auto rounded-lg border bg-white p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {availableItems.map((item) => (
                <PosItemCard key={item.id} item={item} onAdd={addItem} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex w-96 flex-col rounded-lg border bg-white shadow">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">Orden actual</h2>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {order.length === 0 ? (
            <p className="text-sm text-gray-500">Agregue productos</p>
          ) : (
            <ul className="space-y-4">
              {order.map((line, i) => {
                const isCustom = line.menuItemId === null;
                const menuItem = isCustom ? null : items.find((it) => it.id === line.menuItemId);
                const thumbResolved = getProductCardImageUrl(menuItem?.imageUrl ?? null, "");
                const thumbSrc = isCustom || (line.menuItemId && failedThumbIds.has(line.menuItemId))
                  ? DEFAULT_FOOD_IMAGE
                  : thumbResolved.src;
                return (
                  <li key={i} className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbSrc}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => line.menuItemId && setFailedThumbIds((prev) => new Set(prev).add(line.menuItemId!))}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900">{line.nameSnapshot}</div>
                      <div className="mt-1 text-xs text-gray-600">
                        {formatDOP(line.unitPriceCentsSnapshot)} × {line.quantity}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button type="button" onClick={() => updateQty(i, -1)} className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-700 hover:bg-gray-100">−</button>
                        <span className="min-w-[1.5rem] text-center text-sm font-medium text-gray-900">{line.quantity}</span>
                        <button type="button" onClick={() => updateQty(i, 1)} className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-700 hover:bg-gray-100">+</button>
                      </div>
                      <input
                        type="text"
                        value={line.notes ?? ""}
                        onChange={(e) => updateLineNotes(i, e.target.value)}
                        placeholder="Modificaciones (ej. sin cebolla)"
                        className="mt-2 w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400"
                        aria-label={`Notas para ${line.nameSnapshot}`}
                      />
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold text-gray-900">{formatDOP(line.lineTotalCents)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {canAddCustomItem && (
            <Button
              type="button"
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => setCustomItemOpen(true)}
            >
              + Artículo personalizado
            </Button>
          )}
          <label className="mt-4 block text-sm font-medium text-gray-700">Notas del pedido</label>
          <textarea
            placeholder="Instrucciones o comentarios..."
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 p-2 text-sm text-gray-900 placeholder:text-gray-400"
            rows={2}
          />
        </div>
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-base font-semibold text-gray-900">Total</span>
            <span className="text-lg font-bold text-gray-900">{formatDOP(totalCents)}</span>
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

      <Modal open={customItemOpen} onClose={() => setCustomItemOpen(false)} title="Artículo personalizado">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Agregar un artículo que no está en el menú (ej. pedido especial). Solo visible para administradores/gerentes.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">Nombre del artículo</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ej. Ensalada sin cebolla"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">Precio (RD$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={customPriceRd}
              onChange={(e) => setCustomPriceRd(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCustomItemOpen(false)}>Cancelar</Button>
            <Button
              onClick={addCustomItem}
              disabled={!customName.trim() || !customPriceRd || parseFloat(customPriceRd.replace(",", ".")) < 0}
            >
              Agregar a la orden
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Cobrar">
        <div className="space-y-4 text-gray-900">
          <div className="text-xl font-bold text-gray-900">Total: {formatDOP(totalCents)}</div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-900">Método de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "CARD" | "TRANSFER" | "MIXED")}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
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
                <label className="mb-1 block text-sm font-semibold text-gray-900">Efectivo recibido (RD$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                />
              </div>
              {cashReceivedCents >= totalCents && (
                <p className="text-lg font-semibold text-green-700">Cambio: {formatDOP(changeCents)}</p>
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
