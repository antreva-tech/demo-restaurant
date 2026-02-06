"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDOP, computeOrderTotalInclusive } from "@/lib/money";
import { getOrderForAdminView, updateOrderWithItems, updateOrderAdmin, type OrderItemUpdate, type OrderItemCreate } from "@/server/actions/orders";
import type { OrderStatus } from "@prisma/client";

type OrderWithDetails = Awaited<ReturnType<typeof getOrderForAdminView>>["order"];

/** Existing line item (quantity/notes editable). */
type EditableItem = {
  id: string;
  nameSnapshot: string;
  unitPriceCentsSnapshot: number;
  quantity: number;
  notes: string;
};

/** New line item not yet saved (has tempId, menuItemId). */
type NewItem = {
  tempId: string;
  menuItemId: string;
  nameSnapshot: string;
  unitPriceCentsSnapshot: number;
  quantity: number;
  notes: string;
};

type FormLineItem = EditableItem | NewItem;

function isNewItem(i: FormLineItem): i is NewItem {
  return "tempId" in i;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  OPEN: "Abierta",
  PAID: "Pagada",
  VOID: "Anulada",
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  MIXED: "Mixto",
};

/** Renders order totals; when formItems is set, uses estimated totals from line items. Tax row hidden (included in prices). */
function TotalsTable({
  order,
  formItems,
}: {
  order: NonNullable<OrderWithDetails>;
  formItems: FormLineItem[] | null;
}) {
  const useEstimated = formItems && formItems.length > 0;
  const subtotalCents = useEstimated
    ? formItems.reduce((s, i) => s + i.quantity * i.unitPriceCentsSnapshot, 0)
    : order.subtotalCents;
  const { serviceChargeCents, totalCents } = useEstimated
    ? computeOrderTotalInclusive(subtotalCents, order.discountCents)
    : { serviceChargeCents: order.serviceChargeCents, totalCents: order.totalCents };

  return (
    <table className="w-56 text-sm text-antreva-navy">
      <tbody>
        {serviceChargeCents > 0 && (
          <tr>
            <td className="py-0.5 text-antreva-slate">Servicio</td>
            <td className="py-0.5 text-right">{formatDOP(serviceChargeCents)}</td>
          </tr>
        )}
        {order.discountCents > 0 && (
          <tr>
            <td className="py-0.5 text-antreva-slate">Descuento</td>
            <td className="py-0.5 text-right">-{formatDOP(order.discountCents)}</td>
          </tr>
        )}
        <tr className="border-t font-semibold">
          <td className="py-1">Total</td>
          <td className="py-1 text-right">{formatDOP(totalCents)}</td>
        </tr>
      </tbody>
    </table>
  );
}

interface OrderInvoiceModalProps {
  orderId: string | null;
  onClose: () => void;
}

/**
 * Modal that shows a single order as an invoice and allows editing order fields and line items (quantity, notes, remove).
 */
export function OrderInvoiceModal({ orderId, onClose }: OrderInvoiceModalProps) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    status: "PAID" as OrderStatus,
    notes: "",
    customerName: "",
    customerPhone: "",
  });
  const [formItems, setFormItems] = useState<FormLineItem[]>([]);
  const [statusBusy, setStatusBusy] = useState(false);
  const [addItem, setAddItem] = useState({ menuItemId: "", quantity: 1, notes: "" });

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    getOrderForAdminView(orderId).then((res) => {
      setLoading(false);
      if (res.error && !res.order) {
        setError(res.error);
        setOrder(null);
        return;
      }
      const o = res.order;
      setOrder(o ?? null);
      if (o) {
        setForm({
          status: o.status,
          notes: o.notes ?? "",
          customerName: o.customerName ?? "",
          customerPhone: o.customerPhone ?? "",
        });
        setFormItems(
          o.items.map((i) => ({
            id: i.id,
            nameSnapshot: i.nameSnapshot,
            unitPriceCentsSnapshot: i.unitPriceCentsSnapshot,
            quantity: i.quantity,
            notes: i.notes ?? "",
          })) as EditableItem[]
        );
      }
    });
  }, [orderId]);

  function initEditFromOrder() {
    if (!order) return;
    setForm({
      status: order.status,
      notes: order.notes ?? "",
      customerName: order.customerName ?? "",
      customerPhone: order.customerPhone ?? "",
    });
    setFormItems(
      order.items.map((i) => ({
        id: i.id,
        nameSnapshot: i.nameSnapshot,
        unitPriceCentsSnapshot: i.unitPriceCentsSnapshot,
        quantity: i.quantity,
        notes: i.notes ?? "",
      })) as EditableItem[]
    );
    setAddItem({ menuItemId: "", quantity: 1, notes: "" });
    setEditing(true);
  }

  async function setStatusQuick(status: OrderStatus) {
    if (!orderId) return;
    setStatusBusy(true);
    setError(null);
    const res = await updateOrderAdmin({ orderId, status });
    setStatusBusy(false);
    if (res.error) setError(res.error);
    else {
      const updated = await getOrderForAdminView(orderId);
      if (updated.order) {
        setOrder(updated.order);
        setForm((f) => ({ ...f, status }));
      }
      router.refresh();
    }
  }

  function handleAddItem() {
    const location = order?.location as { menuItems?: { id: string; name: string; priceCents: number }[] } | undefined;
    const menuItems = location?.menuItems ?? [];
    const menuItem = menuItems.find((m) => m.id === addItem.menuItemId);
    if (!menuItem || addItem.quantity < 1) return;
    setFormItems((prev) => [
      ...prev,
      {
        tempId: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        menuItemId: menuItem.id,
        nameSnapshot: menuItem.name,
        unitPriceCentsSnapshot: menuItem.priceCents,
        quantity: addItem.quantity,
        notes: addItem.notes.trim() || "",
      },
    ]);
    setAddItem({ menuItemId: "", quantity: 1, notes: "" });
  }

  async function handleSave() {
    if (!orderId || !order) return;
    const itemsToSave = formItems.filter((i) => i.quantity > 0);
    if (itemsToSave.length === 0) {
      setError("Debe haber al menos un artículo.");
      return;
    }
    const updates: OrderItemUpdate[] = itemsToSave
      .filter((i): i is EditableItem => !isNewItem(i))
      .map((i) => ({ id: i.id, quantity: i.quantity, notes: i.notes || null }));
    const creates: OrderItemCreate[] = itemsToSave
      .filter(isNewItem)
      .map((i) => ({
        menuItemId: i.menuItemId,
        nameSnapshot: i.nameSnapshot,
        unitPriceCentsSnapshot: i.unitPriceCentsSnapshot,
        quantity: i.quantity,
        notes: i.notes || null,
      }));
    setSaving(true);
    setError(null);
    const res = await updateOrderWithItems({
      orderId,
      status: form.status,
      notes: form.notes || null,
      customerName: form.customerName || null,
      customerPhone: form.customerPhone || null,
      items: [...updates, ...creates],
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setError(null);
    setEditing(false);
    const updated = await getOrderForAdminView(orderId);
    if (updated.order) setOrder(updated.order);
    router.refresh();
  }

  const open = !!orderId;
  const displayOrder = order;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={displayOrder ? `Orden #${displayOrder.orderNumber ?? displayOrder.id?.slice(0, 8) ?? "—"}` : "Orden"}
      contentClassName="max-w-2xl"
    >
      {loading && <p className="text-antreva-slate">Cargando…</p>}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {displayOrder && !loading && (
        <div className="space-y-4">
          {/* Invoice header */}
          <div className="border-b pb-3 text-sm text-antreva-navy">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">Factura / Orden</p>
                <p className="text-antreva-slate">N.º {displayOrder.orderNumber ?? displayOrder.id?.slice(0, 8) ?? "—"}</p>
                <p>{displayOrder.location.name}</p>
                {displayOrder.location.address && (
                  <p className="text-antreva-slate">{displayOrder.location.address}</p>
                )}
              </div>
              <div className="text-right">
                <p>{new Date(displayOrder.createdAt).toLocaleString("es-DO")}</p>
                <p className="text-antreva-slate">
                  {displayOrder.employee.name === "Online"
                    ? "Online"
                    : `${displayOrder.employee.name}${displayOrder.employee.employeeNumber ? ` (${displayOrder.employee.employeeNumber})` : ""}`}
                </p>
              </div>
            </div>
            {(displayOrder.customerName || displayOrder.customerPhone) && (
              <p className="mt-2 text-antreva-slate">
                Cliente: {[displayOrder.customerName, displayOrder.customerPhone].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {/* Quick status toggle: Pagada / Abierta / Anulada */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-antreva-navy">Estado:</span>
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {(["PAID", "OPEN", "VOID"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={statusBusy}
                  onClick={() => setStatusQuick(s)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                    displayOrder.status === s
                      ? "bg-white text-antreva-navy shadow-sm"
                      : "text-antreva-slate hover:text-antreva-navy"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Line items: read-only view or editable rows */}
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-antreva-navy">
                <th className="pb-1 pr-2">Producto</th>
                <th className="w-14 pb-1 pr-2 text-right">Cant.</th>
                <th className="w-20 pb-1 pr-2 text-right">P. unit.</th>
                <th className="w-24 pb-1 text-right">Total</th>
                {editing && <th className="w-8 pb-1" aria-label="Quitar" />}
              </tr>
            </thead>
            <tbody>
              {(editing ? formItems : displayOrder.items).map((item) => {
                const key = "id" in item ? item.id : item.tempId;
                const notes = "notes" in item ? item.notes : (item as { notes?: string | null }).notes ?? "";
                const quantity = item.quantity;
                return (
                  <tr key={key} className="border-b text-antreva-navy">
                    <td className="py-1.5 pr-2">
                      <span className="block font-medium">{item.nameSnapshot}</span>
                      {editing ? (
                        <input
                          type="text"
                          value={notes ?? ""}
                          onChange={(e) =>
                            setFormItems((prev) =>
                              prev.map((i) =>
                                ("id" in i ? i.id === key : i.tempId === key)
                                  ? { ...i, notes: e.target.value }
                                  : i
                              )
                            )
                          }
                          placeholder="Notas línea"
                          className="input-premium mt-0.5 w-full py-1.5 text-xs"
                        />
                      ) : (
                        (item as { notes?: string | null }).notes && (
                          <span className="block text-xs text-antreva-slate">
                            {(item as { notes?: string | null }).notes}
                          </span>
                        )
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-right">
                      {editing ? (
                        <input
                          type="number"
                          min={0}
                          value={quantity}
                          onChange={(e) => {
                            const q = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setFormItems((prev) =>
                              prev.map((i) =>
                                ("id" in i ? i.id === key : i.tempId === key) ? { ...i, quantity: q } : i
                              )
                            );
                          }}
                          className="input-premium w-14 py-1 text-right text-sm"
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-right">{formatDOP(item.unitPriceCentsSnapshot)}</td>
                    <td className="py-1.5 text-right">
                      {formatDOP(
                        editing
                          ? quantity * item.unitPriceCentsSnapshot
                          : (item as { lineTotalCents?: number }).lineTotalCents ?? 0
                      )}
                    </td>
                    {editing && (
                      <td className="py-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() =>
                            setFormItems((prev) =>
                              prev.filter((i) => ("id" in i ? i.id !== key : i.tempId !== key))
                            )
                          }
                          aria-label="Quitar línea"
                        >
                          ×
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Add item row (when editing) */}
          {editing && (() => {
            const location = order?.location as { menuItems?: { id: string; name: string; priceCents: number }[] } | undefined;
            const menuItems = location?.menuItems ?? [];
            return (
              <div className="form-section space-y-2">
                <h4 className="text-sm font-semibold text-antreva-navy">Agregar artículo</h4>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[180px] flex-1">
                    <label className="mb-1 block text-xs font-medium text-antreva-slate">Producto</label>
                    <select
                      value={addItem.menuItemId}
                      onChange={(e) => setAddItem((a) => ({ ...a, menuItemId: e.target.value }))}
                      className="select-premium w-full"
                    >
                      <option value="">Seleccionar…</option>
                      {menuItems.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {formatDOP(m.priceCents)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="mb-1 block text-xs font-medium text-antreva-slate">Cant.</label>
                    <input
                      type="number"
                      min={1}
                      value={addItem.quantity}
                      onChange={(e) =>
                        setAddItem((a) => ({ ...a, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                      }
                      className="input-premium w-full py-2 text-center"
                    />
                  </div>
                  <div className="min-w-[120px] flex-1">
                    <label className="mb-1 block text-xs font-medium text-antreva-slate">Notas</label>
                    <input
                      type="text"
                      value={addItem.notes}
                      onChange={(e) => setAddItem((a) => ({ ...a, notes: e.target.value }))}
                      placeholder="Opcional"
                      className="input-premium w-full py-2"
                    />
                  </div>
                  <Button type="button" variant="gold" size="sm" onClick={handleAddItem} disabled={!addItem.menuItemId}>
                    Agregar
                  </Button>
                </div>
              </div>
            );
          })()}

          {/* Totals (when editing, show estimated from formItems) */}
          <div className="flex justify-end">
            <TotalsTable order={displayOrder!} formItems={editing ? formItems : null} />
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-antreva-navy">
            <span>
              Pago: {(displayOrder as { paymentChannel?: string | null }).paymentChannel
                ? PAYMENT_LABELS[(displayOrder as { paymentChannel?: string }).paymentChannel!] ?? (displayOrder as { paymentChannel?: string }).paymentChannel
                : displayOrder.paymentMethod
                  ? PAYMENT_LABELS[displayOrder.paymentMethod] ?? displayOrder.paymentMethod
                  : "—"}
              {(displayOrder as { payment?: { provider: string; approvalCode: string | null } }).payment?.approvalCode && (
                <span className="ml-1 text-antreva-slate">
                  (Cód. aprob.: ****{(displayOrder as { payment: { approvalCode: string } }).payment.approvalCode.slice(-4)})
                </span>
              )}
            </span>
            <span>Estado: {STATUS_LABELS[displayOrder.status]}</span>
            {displayOrder.notes && <span className="w-full text-antreva-slate">Notas: {displayOrder.notes}</span>}
          </div>

          {/* Edit form */}
          {editing ? (
            <div className="form-section space-y-4">
              <h3 className="text-sm font-semibold text-antreva-navy">Detalles de la orden</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-antreva-navy">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as OrderStatus }))}
                    className="select-premium w-full"
                  >
                    {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Nombre cliente"
                  value={form.customerName}
                  onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                  labelClassName="text-antreva-navy"
                />
                <Input
                  label="Teléfono cliente"
                  value={form.customerPhone}
                  onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
                  labelClassName="text-antreva-navy"
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Notas de la orden"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    labelClassName="text-antreva-navy"
                  />
                </div>
              </div>
              <div className="flex gap-2 border-t border-gray-200 pt-3">
                <Button variant="gold" size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Guardando…" : "Guardar cambios"}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button variant="goldSecondary" size="sm" onClick={initEditFromOrder}>
                Editar orden
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
