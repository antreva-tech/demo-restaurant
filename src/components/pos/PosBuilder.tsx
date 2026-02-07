"use client";

import { useState, useEffect } from "react";
import { getPosMenu } from "@/server/actions/pos";
import { createOrderAndPay, createOrderOpen } from "@/server/actions/orders";
import { createPaymentLink, checkPaymentStatus, confirmTerminalPayment, completeTransferPayment, payOpenOrderWithCash } from "@/server/actions/payments";
import { getOpenOrdersForPosAction } from "@/server/actions/pos";
import { getIntegrationsForPos } from "@/server/actions/payment-integrations";
import { formatDOP, computeOrderTotalInclusive } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PosItemCard } from "@/components/pos/PosItemCard";
import { PosOrderPanelContent, type OrderLine } from "@/components/pos/PosOrderPanelContent";
import { PosUnpaidOrdersPanel, type OpenOrderForPos } from "@/components/pos/PosUnpaidOrdersPanel";
import { PosPayOpenOrderModal } from "@/components/pos/PosPayOpenOrderModal";
import { POS_ORDER_STORAGE_KEY } from "@/lib/pos-storage";
import type { Category, MenuItem, Location } from "@prisma/client";
import type { EnabledIntegrationsForPos } from "@/server/payments/providers/registry";
import QRCode from "qrcode";

/** Returns true if value looks like a valid OrderLine. */
function isOrderLine(x: unknown): x is OrderLine {
  return (
    typeof x === "object" &&
    x !== null &&
    "nameSnapshot" in x &&
    "unitPriceCentsSnapshot" in x &&
    "quantity" in x &&
    "lineTotalCents" in x
  );
}

function parseStoredOrder(raw: string | null): { order: OrderLine[]; orderNotes: string } {
  if (!raw) return { order: [], orderNotes: "" };
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return { order: [], orderNotes: "" };
    const order = Array.isArray((data as { order?: unknown }).order)
      ? ((data as { order: unknown[] }).order.filter(isOrderLine))
      : [];
    const orderNotes = typeof (data as { orderNotes?: string }).orderNotes === "string"
      ? (data as { orderNotes: string }).orderNotes
      : "";
    return { order, orderNotes };
  } catch {
    return { order: [], orderNotes: "" };
  }
}

/** Re-export for consumers that import from PosBuilder. */
export type { OrderLine } from "@/components/pos/PosOrderPanelContent";

interface PosBuilderProps {
  locations: Location[];
  restaurant: {
    taxRateBps: number;
    serviceChargeBps: number;
    allowCash: boolean;
    allowTransfer: boolean;
    allowCard: boolean;
  };
  initialIntegrations: EnabledIntegrationsForPos;
  canAddCustomItem?: boolean;
}

type PaymentMode = "CASH" | "TRANSFER" | "CARD_LINK" | "CARD_TERMINAL";

export function PosBuilder({
  locations,
  restaurant,
  initialIntegrations,
  canAddCustomItem = false,
}: PosBuilderProps) {
  const [locationId, setLocationId] = useState<string>(locations[0]?.id ?? "");
  const [integrations, setIntegrations] = useState<EnabledIntegrationsForPos>(initialIntegrations);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderLine[]>(() => {
    if (typeof window === "undefined") return [];
    return parseStoredOrder(sessionStorage.getItem(POS_ORDER_STORAGE_KEY)).order;
  });
  const [orderNotes, setOrderNotes] = useState(() => {
    if (typeof window === "undefined") return "";
    return parseStoredOrder(sessionStorage.getItem(POS_ORDER_STORAGE_KEY)).orderNotes;
  });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null);
  const [cashReceived, setCashReceived] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [failedThumbIds, setFailedThumbIds] = useState<Set<string>>(new Set());
  const [customItemOpen, setCustomItemOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPriceRd, setCustomPriceRd] = useState("");
  /** Deferred payment: order created OPEN, then we show link/terminal/transfer UI. */
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  /** Card link modal: url + paymentId (+ orderId when paying open order); or not_implemented fallback. */
  const [linkModal, setLinkModal] = useState<{ url: string; paymentId: string; orderId?: string } | { error: "not_implemented"; orderId: string } | null>(null);
  const [linkStatus, setLinkStatus] = useState<"PENDING" | "SUCCEEDED" | "CHECKING">("PENDING");
  /** Terminal modal: orderId + integrationId + optional totalCents when paying an open order. */
  const [terminalModal, setTerminalModal] = useState<{ orderId: string; integrationId: string; totalCents?: number } | null>(null);
  const [terminalApproval, setTerminalApproval] = useState("");
  const [terminalLast4, setTerminalLast4] = useState("");
  /** Transfer modal: orderId + optional totalCents when paying an open order. */
  const [transferModal, setTransferModal] = useState<{ orderId: string; totalCents?: number } | null>(null);
  const [transferRef, setTransferRef] = useState("");
  /** On phone: when true, show slide-over order panel with blurred backdrop. */
  const [orderPanelOpen, setOrderPanelOpen] = useState(false);
  /** "Cobrar después" flow: show name/phone form in checkout modal. */
  const [chargeLaterForm, setChargeLaterForm] = useState(false);
  const [chargeLaterName, setChargeLaterName] = useState("");
  const [chargeLaterPhone, setChargeLaterPhone] = useState("");
  /** Unpaid orders list panel and pay-selected-order flow. */
  const [unpaidListOpen, setUnpaidListOpen] = useState(false);
  const [selectedOpenOrder, setSelectedOpenOrder] = useState<OpenOrderForPos | null>(null);
  const [refreshUnpaidTrigger, setRefreshUnpaidTrigger] = useState(0);
  /** Cash modal for paying an existing OPEN order. */
  const [payOpenOrderCashModal, setPayOpenOrderCashModal] = useState<{ orderId: string; totalCents: number } | null>(null);
  const [payOpenOrderCashReceived, setPayOpenOrderCashReceived] = useState("");

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

  useEffect(() => {
    if (!locationId) return;
    getIntegrationsForPos(locationId).then((res) => {
      if (!("error" in res)) setIntegrations({ cardLink: res.cardLink, terminal: res.terminal });
    });
  }, [locationId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(
      POS_ORDER_STORAGE_KEY,
      JSON.stringify({ order, orderNotes })
    );
  }, [order, orderNotes]);

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
  const changeCents = paymentMode === "CASH" ? Math.max(0, cashReceivedCents - totalCents) : 0;

  async function handlePayCash() {
    if (order.length === 0) return;
    if (cashReceivedCents < totalCents) {
      alert("Efectivo recibido debe ser mayor o igual al total.");
      return;
    }
    setPayLoading(true);
    const res = await createOrderAndPay({
      locationId,
      items: order,
      orderNotes: orderNotes || undefined,
      paymentMethod: "CASH",
      cashReceivedCents,
    });
    setPayLoading(false);
    if (res?.ok) {
      setOrder([]);
      setOrderNotes("");
      setCheckoutOpen(false);
      setCashReceived("");
      setPaymentMode(null);
    } else {
      alert((res as { error?: string })?.error ?? "Error al guardar");
    }
  }

  async function handleTransferClick() {
    if (order.length === 0) return;
    setPayLoading(true);
    const res = await createOrderOpen({ locationId, items: order, orderNotes: orderNotes || undefined });
    setPayLoading(false);
    if (res?.ok && res.orderId) {
      setOpenOrderId(res.orderId);
      setTransferModal({ orderId: res.orderId });
      setCheckoutOpen(false);
    } else {
      alert((res as { error?: string })?.error ?? "Error al crear orden");
    }
  }

  async function handleTransferConfirm() {
    if (!transferModal) return;
    const wasOrderId = transferModal.orderId;
    setPayLoading(true);
    const res = await completeTransferPayment(wasOrderId, transferRef.trim() || undefined);
    setPayLoading(false);
    if (res?.ok) {
      setTransferModal(null);
      setTransferRef("");
      if (openOrderId === wasOrderId) {
        setOrder([]);
        setOrderNotes("");
        setOpenOrderId(null);
      }
      if (selectedOpenOrder?.id === wasOrderId) {
        setSelectedOpenOrder(null);
        setRefreshUnpaidTrigger((t) => t + 1);
      }
    } else {
      alert((res as { error?: string })?.error ?? "Error");
    }
  }

  async function handleCardLinkClick(integrationId: string) {
    if (order.length === 0) return;
    setPayLoading(true);
    const openRes = await createOrderOpen({ locationId, items: order, orderNotes: orderNotes || undefined });
    if (!openRes?.ok || !openRes.orderId) {
      setPayLoading(false);
      alert((openRes as { error?: string })?.error ?? "Error al crear orden");
      return;
    }
    const linkRes = await createPaymentLink(openRes.orderId, integrationId);
    setPayLoading(false);
    if (linkRes?.ok && "url" in linkRes) {
      setOpenOrderId(openRes.orderId);
      setLinkModal({ url: linkRes.url, paymentId: linkRes.paymentId });
      setLinkStatus("PENDING");
      setCheckoutOpen(false);
    } else if (linkRes?.error === "not_implemented") {
      setOpenOrderId(openRes.orderId);
      setLinkModal({ error: "not_implemented", orderId: openRes.orderId });
      setCheckoutOpen(false);
    } else {
      alert((linkRes as { error?: string })?.error ?? "Error");
    }
  }

  async function handleCardTerminalClick(integrationId: string) {
    if (order.length === 0) return;
    setPayLoading(true);
    const res = await createOrderOpen({ locationId, items: order, orderNotes: orderNotes || undefined });
    setPayLoading(false);
    if (res?.ok && res.orderId) {
      setOpenOrderId(res.orderId);
      setTerminalModal({ orderId: res.orderId, integrationId });
      setTerminalApproval("");
      setTerminalLast4("");
      setCheckoutOpen(false);
    } else {
      alert((res as { error?: string })?.error ?? "Error al crear orden");
    }
  }

  async function handleTerminalConfirm() {
    if (!terminalModal) return;
    if (!terminalApproval.trim()) {
      alert("Código de aprobación es requerido.");
      return;
    }
    const wasOrderId = terminalModal.orderId;
    setPayLoading(true);
    const res = await confirmTerminalPayment(wasOrderId, terminalModal.integrationId, {
      approvalCode: terminalApproval.trim(),
      last4: terminalLast4.trim() || undefined,
    });
    setPayLoading(false);
    if (res?.ok) {
      setTerminalModal(null);
      setTerminalApproval("");
      setTerminalLast4("");
      if (openOrderId === wasOrderId) {
        setOrder([]);
        setOrderNotes("");
        setOpenOrderId(null);
      }
      if (selectedOpenOrder?.id === wasOrderId) {
        setSelectedOpenOrder(null);
        setRefreshUnpaidTrigger((t) => t + 1);
      }
    } else {
      alert((res as { error?: string })?.error ?? "Error");
    }
  }

  async function handleLinkCheckStatus(paymentId: string) {
    setLinkStatus("CHECKING");
    const res = await checkPaymentStatus(paymentId);
    if (res?.ok && res.status === "SUCCEEDED") {
      setLinkStatus("SUCCEEDED");
      const wasOrderId = linkModal && "orderId" in linkModal ? linkModal.orderId : openOrderId;
      setLinkModal(null);
      setOpenOrderId(null);
      if (openOrderId === wasOrderId) {
        setOrder([]);
        setOrderNotes("");
      }
      if (selectedOpenOrder?.id === wasOrderId) {
        setSelectedOpenOrder(null);
        setRefreshUnpaidTrigger((t) => t + 1);
      }
    } else {
      setLinkStatus("PENDING");
      if (res?.error) alert(res.error);
    }
  }

  function resetAfterLinkFallback() {
    if (linkModal && "error" in linkModal && linkModal.error === "not_implemented") {
      const orderId = linkModal.orderId;
      const firstTerminal = integrations.terminal[0];
      if (firstTerminal) {
        setLinkModal(null);
        setTerminalModal({ orderId, integrationId: firstTerminal.id });
        setTerminalApproval("");
        setTerminalLast4("");
      }
    }
  }

  /** "Cobrar después": create OPEN order with customer name so it can be found in "Órdenes por cobrar". */
  async function handleChargeLaterSubmit() {
    const name = chargeLaterName.trim();
    if (!name) {
      alert("Nombre del cliente es requerido para cobrar después.");
      return;
    }
    if (order.length === 0) return;
    setPayLoading(true);
    const res = await createOrderOpen({
      locationId,
      items: order,
      orderNotes: orderNotes || undefined,
      customerName: name,
      customerPhone: chargeLaterPhone.trim() || undefined,
    });
    setPayLoading(false);
    if (res?.ok && res.orderId) {
      setOrder([]);
      setOrderNotes("");
      setCheckoutOpen(false);
      setChargeLaterForm(false);
      setChargeLaterName("");
      setChargeLaterPhone("");
      const num = "orderNumber" in res && typeof res.orderNumber === "number" ? res.orderNumber : "";
      alert(num ? `Orden #${num} guardada para cobrar después.` : "Orden guardada para cobrar después.");
      setRefreshUnpaidTrigger((t) => t + 1);
    } else {
      alert((res as { error?: string })?.error ?? "Error al guardar");
    }
  }

  /** Pay selected OPEN order with card link: create payment link then show QR/link modal. */
  async function handlePayOpenOrderCardLink(integrationId: string) {
    if (!selectedOpenOrder) return;
    setPayLoading(true);
    const linkRes = await createPaymentLink(selectedOpenOrder.id, integrationId);
    setPayLoading(false);
    if (linkRes?.ok && "url" in linkRes) {
      setLinkModal({ url: linkRes.url, paymentId: linkRes.paymentId, orderId: selectedOpenOrder.id });
      setLinkStatus("PENDING");
    } else if (linkRes?.error === "not_implemented") {
      setLinkModal({ error: "not_implemented", orderId: selectedOpenOrder.id });
    } else {
      alert((linkRes as { error?: string })?.error ?? "Error");
    }
  }

  /** Pay selected OPEN order with cash. */
  async function handlePayOpenOrderCash() {
    if (!payOpenOrderCashModal) return;
    const cents = Math.round(parseFloat(payOpenOrderCashReceived || "0") * 100);
    if (cents < payOpenOrderCashModal.totalCents) {
      alert("Efectivo recibido debe ser mayor o igual al total.");
      return;
    }
    setPayLoading(true);
    const res = await payOpenOrderWithCash(payOpenOrderCashModal.orderId, cents);
    setPayLoading(false);
    if (res?.ok) {
      setPayOpenOrderCashModal(null);
      setPayOpenOrderCashReceived("");
      setSelectedOpenOrder(null);
      setRefreshUnpaidTrigger((t) => t + 1);
    } else {
      alert((res as { error?: string })?.error ?? "Error");
    }
  }

  const transferDisplayCents = transferModal?.totalCents ?? totalCents;
  const terminalDisplayCents = terminalModal?.totalCents ?? totalCents;

  const availableItems = items.filter((i) => i.isAvailable);

  /** Opens checkout and on phone closes the order drawer. */
  function handleCheckoutClick() {
    setCheckoutOpen(true);
    setOrderPanelOpen(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 pb-24 md:flex-row md:pb-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-2 shrink-0 flex flex-wrap items-center gap-2">
          {locations.length > 1 && (
            <>
              <label className="mr-2 text-sm text-gray-600">Ubicación:</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="min-h-[44px] touch-manipulation rounded border border-gray-300 px-3 py-2"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </>
          )}
          <Button
            variant="goldSecondary"
            onClick={() => setUnpaidListOpen(true)}
            className="ml-auto md:ml-0"
          >
            Órdenes por cobrar
          </Button>
        </div>
        {loading ? (
          <p className="text-gray-600">Cargando menú…</p>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-white p-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {availableItems.map((item) => (
                <PosItemCard
                  key={item.id}
                  item={item}
                  onAdd={addItem}
                  quantityInOrder={order.reduce((s, l) => (l.menuItemId === item.id ? s + l.quantity : s), 0)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop/tablet: order panel as sidebar (landscape-friendly). */}
      <div className="hidden min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-lg border bg-white shadow md:flex md:w-80 lg:w-96">
        <PosOrderPanelContent
          order={order}
          items={items}
          failedThumbIds={failedThumbIds}
          setFailedThumbIds={setFailedThumbIds}
          updateQty={updateQty}
          updateLineNotes={updateLineNotes}
          orderNotes={orderNotes}
          setOrderNotes={setOrderNotes}
          totalCents={totalCents}
          onCheckout={handleCheckoutClick}
          canAddCustomItem={canAddCustomItem}
          onAddCustomItem={() => setCustomItemOpen(true)}
        />
      </div>

      {/* Phone: floating "Completar pedido" when order has items; opens order drawer. */}
      {order.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 safe-area-bottom md:hidden">
          <button
            type="button"
            onClick={() => setOrderPanelOpen(true)}
            className="w-full min-h-[52px] touch-manipulation rounded-xl bg-antreva-blue px-6 py-3 text-base font-semibold text-white shadow-lg transition active:opacity-90"
            aria-label="Ver orden y cobrar"
          >
            Completar pedido {order.length > 0 && `(${order.length})`}
          </button>
        </div>
      )}

      {/* Phone: slide-over order panel with blurred backdrop. */}
      {orderPanelOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
            aria-hidden
            onClick={() => setOrderPanelOpen(false)}
          />
          <div
            className="pos-drawer-panel fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl safe-area-top safe-area-bottom md:hidden"
            role="dialog"
            aria-label="Orden actual"
          >
            <PosOrderPanelContent
              order={order}
              items={items}
              failedThumbIds={failedThumbIds}
              setFailedThumbIds={setFailedThumbIds}
              updateQty={updateQty}
              updateLineNotes={updateLineNotes}
              orderNotes={orderNotes}
              setOrderNotes={setOrderNotes}
              totalCents={totalCents}
              onCheckout={handleCheckoutClick}
              canAddCustomItem={canAddCustomItem}
              onAddCustomItem={() => setCustomItemOpen(true)}
              onClose={() => setOrderPanelOpen(false)}
            />
          </div>
        </>
      )}

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

      <Modal open={checkoutOpen} onClose={() => { setCheckoutOpen(false); setPaymentMode(null); setChargeLaterForm(false); }} title="Cobrar">
        <div className="space-y-4 text-gray-900">
          <div className="text-xl font-bold text-gray-900">Total: {formatDOP(totalCents)}</div>
          {chargeLaterForm ? (
            <>
              <p className="text-sm text-gray-600">Guardar orden para cobrar después. Nombre del cliente es requerido para buscarla luego.</p>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">Nombre del cliente *</label>
                <input
                  type="text"
                  value={chargeLaterName}
                  onChange={(e) => setChargeLaterName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">Teléfono (opcional)</label>
                <input
                  type="text"
                  value={chargeLaterPhone}
                  onChange={(e) => setChargeLaterPhone(e.target.value)}
                  placeholder="Ej. 809-555-0000"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setChargeLaterForm(false)}>Atrás</Button>
                <Button onClick={handleChargeLaterSubmit} disabled={payLoading || !chargeLaterName.trim()}>
                  {payLoading ? "Guardando…" : "Guardar para cobrar después"}
                </Button>
              </div>
            </>
          ) : (
            <>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">Método de pago</label>
            <div className="flex flex-wrap gap-2">
              {restaurant.allowCash && (
                <Button variant="gold" onClick={() => setPaymentMode("CASH")}>
                  Efectivo
                </Button>
              )}
              {restaurant.allowTransfer && (
                <Button variant="goldSecondary" onClick={handleTransferClick} disabled={payLoading}>
                  Transferencia
                </Button>
              )}
              {restaurant.allowCard && integrations.cardLink.length > 0 && (
                <Button
                  variant="goldSecondary"
                  onClick={() => handleCardLinkClick(integrations.cardLink[0].id)}
                  disabled={payLoading}
                >
                  Tarjeta (Link/QR)
                </Button>
              )}
              {restaurant.allowCard && integrations.terminal.length > 0 && (
                <Button
                  variant="goldSecondary"
                  onClick={() => handleCardTerminalClick(integrations.terminal[0].id)}
                  disabled={payLoading}
                >
                  Tarjeta (Terminal)
                </Button>
              )}
              <Button variant="secondary" onClick={() => setChargeLaterForm(true)}>
                Cobrar después
              </Button>
            </div>
          </div>
          {paymentMode === "CASH" && (
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
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setPaymentMode(null)}>Atrás</Button>
                <Button onClick={handlePayCash} disabled={payLoading || cashReceivedCents < totalCents}>
                  {payLoading ? "Guardando…" : "Marcar como pagado"}
                </Button>
              </div>
            </>
          )}
          {paymentMode !== "CASH" && (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setCheckoutOpen(false)}>Cancelar</Button>
            </div>
          )}
            </>
          )}
        </div>
      </Modal>

      {linkModal && "url" in linkModal && (
        <Modal open onClose={() => { setLinkModal(null); setOpenOrderId(null); }} title="Tarjeta (Link/QR)">
          <div className="space-y-4">
            <div className="flex justify-center">
              <LinkQr url={linkModal.url} />
            </div>
            <p className="text-center text-sm text-gray-600">
              Estado: {linkStatus === "SUCCEEDED" ? "Pagado" : linkStatus === "CHECKING" ? "Revisando…" : "Pendiente"}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="goldSecondary" onClick={() => navigator.clipboard?.writeText(linkModal.url)}>
                Copiar enlace
              </Button>
              <Button variant="gold" onClick={() => handleLinkCheckStatus(linkModal.paymentId)} disabled={linkStatus === "CHECKING"}>
                Revisar pago
              </Button>
            </div>
            {linkStatus === "SUCCEEDED" && (
              <Button className="w-full" onClick={() => { setLinkModal(null); setOpenOrderId(null); }}>
                Cerrar
              </Button>
            )}
          </div>
        </Modal>
      )}

      {linkModal && "error" in linkModal && linkModal.error === "not_implemented" && (
        <Modal open onClose={() => { setLinkModal(null); setOpenOrderId(null); }} title="Tarjeta (Link/QR)">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Integración configurada pero el conector del proveedor aún no está activo.
            </p>
            <Button className="w-full" onClick={resetAfterLinkFallback}>
              Registrar pago manualmente (Tarjeta)
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => { setLinkModal(null); setOpenOrderId(null); }}>
              Cancelar
            </Button>
          </div>
        </Modal>
      )}

      {terminalModal && (
        <Modal open onClose={() => { setTerminalModal(null); setOpenOrderId(null); setSelectedOpenOrder((o) => (o?.id === terminalModal.orderId ? null : o)); }} title="Tarjeta (Terminal)">
          <div className="space-y-4">
            <p className="text-lg font-semibold text-gray-900">Monto a cobrar: {formatDOP(terminalDisplayCents)}</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900">Código de aprobación *</label>
              <input
                type="text"
                value={terminalApproval}
                onChange={(e) => setTerminalApproval(e.target.value)}
                placeholder="Ej. 123456"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900">Últimos 4 dígitos (opcional)</label>
              <input
                type="text"
                maxLength={4}
                value={terminalLast4}
                onChange={(e) => setTerminalLast4(e.target.value.replace(/\D/g, ""))}
                placeholder="****"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => { setTerminalModal(null); setOpenOrderId(null); }}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleTerminalConfirm} disabled={payLoading || !terminalApproval.trim()}>
                {payLoading ? "Guardando…" : "Confirmar pago"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {transferModal && (
        <Modal open onClose={() => { setTransferModal(null); setOpenOrderId(null); setSelectedOpenOrder((o) => (o?.id === transferModal.orderId ? null : o)); }} title="Transferencia">
          <div className="space-y-4">
            <p className="text-lg font-semibold text-gray-900">Monto: {formatDOP(transferDisplayCents)}</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900">Referencia de transferencia (opcional)</label>
              <input
                type="text"
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
                placeholder="Ej. REF-123"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => { setTransferModal(null); setOpenOrderId(null); setSelectedOpenOrder((o) => (o?.id === transferModal.orderId ? null : o)); }}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleTransferConfirm} disabled={payLoading}>
                {payLoading ? "Guardando…" : "Confirmar pago"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {unpaidListOpen && (
        <Modal open onClose={() => setUnpaidListOpen(false)} title="Órdenes por cobrar">
          <div className="max-h-[80vh] min-h-[300px] w-full max-w-md">
            <PosUnpaidOrdersPanel
              locationId={locationId}
              refreshTrigger={refreshUnpaidTrigger}
              onSelectOrder={(o) => {
                setSelectedOpenOrder(o);
                setUnpaidListOpen(false);
              }}
              onClose={() => setUnpaidListOpen(false)}
            />
          </div>
        </Modal>
      )}

      {selectedOpenOrder && (
        <PosPayOpenOrderModal
          order={selectedOpenOrder}
          restaurant={restaurant}
          integrations={integrations}
          onClose={() => setSelectedOpenOrder(null)}
          onPayCash={() => setPayOpenOrderCashModal({ orderId: selectedOpenOrder.id, totalCents: selectedOpenOrder.totalCents })}
          onPayTransfer={() => setTransferModal({ orderId: selectedOpenOrder.id, totalCents: selectedOpenOrder.totalCents })}
          onPayCardLink={handlePayOpenOrderCardLink}
          onPayCardTerminal={(integrationId) => setTerminalModal({ orderId: selectedOpenOrder.id, integrationId, totalCents: selectedOpenOrder.totalCents })}
        />
      )}

      {payOpenOrderCashModal && (
        <Modal open onClose={() => { setPayOpenOrderCashModal(null); setPayOpenOrderCashReceived(""); }} title="Efectivo">
          <div className="space-y-4">
            <p className="text-lg font-semibold text-gray-900">Total: {formatDOP(payOpenOrderCashModal.totalCents)}</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900">Efectivo recibido (RD$)</label>
              <input
                type="number"
                step="0.01"
                value={payOpenOrderCashReceived}
                onChange={(e) => setPayOpenOrderCashReceived(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
              />
            </div>
            {Math.round(parseFloat(payOpenOrderCashReceived || "0") * 100) >= payOpenOrderCashModal.totalCents && (
              <p className="text-green-700 font-semibold">
                Cambio: {formatDOP(Math.round(parseFloat(payOpenOrderCashReceived || "0") * 100) - payOpenOrderCashModal.totalCents)}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => { setPayOpenOrderCashModal(null); setPayOpenOrderCashReceived(""); }}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handlePayOpenOrderCash}
                disabled={payLoading || Math.round(parseFloat(payOpenOrderCashReceived || "0") * 100) < payOpenOrderCashModal.totalCents}
              >
                {payLoading ? "Guardando…" : "Marcar como pagado"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function LinkQr({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string>("");
  useEffect(() => {
    QRCode.toDataURL(url, { width: 200, margin: 2 }).then(setDataUrl).catch(() => setDataUrl(""));
  }, [url]);
  if (!dataUrl) return <div className="h-[200px] w-[200px] bg-gray-100 rounded" />;
  return <img src={dataUrl} alt="QR de pago" className="h-[200px] w-[200px] rounded" />;
}
