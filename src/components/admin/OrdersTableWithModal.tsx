"use client";

import { useState } from "react";
import { formatDOP } from "@/lib/money";
import { OrderInvoiceModal } from "./OrderInvoiceModal";
import type { OrderStatus } from "@prisma/client";

type OrderRow = {
  id: string;
  orderNumber: number;
  createdAt: Date;
  status: string;
  totalCents: number;
  paymentMethod: string | null;
  customerName: string | null;
  customerPhone: string | null;
  location?: { name: string };
  employee?: { name: string; employeeNumber?: string | null };
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  OPEN: "Abierta",
  PAID: "Pagada",
  VOID: "Anulada",
};

const STATUS_CLASSES: Record<OrderStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800 border-amber-200",
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-200",
  VOID: "bg-gray-100 text-gray-600 border-gray-200",
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  MIXED: "Mixto",
};

interface OrdersTableWithModalProps {
  orders: OrderRow[];
}

/**
 * Admin orders table with clickable rows. Opening a row shows the order as an invoice in a modal with edit support.
 */
export function OrdersTableWithModal({ orders }: OrdersTableWithModalProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  if (orders.length === 0) {
    return <p className="text-antreva-slate">No hay órdenes.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-antreva-navy">
              <th className="pb-2 pr-4">N.º</th>
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
              <tr
                key={o.id}
                className="cursor-pointer border-b text-antreva-navy transition-colors hover:bg-gray-50"
                onClick={() => setSelectedOrderId(o.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedOrderId(o.id);
                  }
                }}
              >
                <td className="py-2 pr-4 font-medium text-antreva-navy">#{o.orderNumber ?? o.id?.slice(0, 8) ?? "—"}</td>
                <td className="py-2 pr-4 text-antreva-navy">
                  {new Date(o.createdAt).toLocaleString("es-DO")}
                </td>
                <td className="py-2 pr-4 text-antreva-navy">{o.location?.name ?? "—"}</td>
                <td className="py-2 pr-4 text-antreva-navy">
                  {o.employee?.name === "Online"
                    ? "Online"
                    : o.employee
                      ? `${o.employee.name}${o.employee.employeeNumber ? ` (${o.employee.employeeNumber})` : ""}`
                      : "—"}
                </td>
                <td className="py-2 pr-4 text-antreva-navy">
                  {o.employee?.name === "Online" && (o.customerName || o.customerPhone)
                    ? [o.customerName, o.customerPhone].filter(Boolean).join(" · ")
                    : "—"}
                </td>
                <td className="py-2 pr-4 text-antreva-navy">{formatDOP(o.totalCents)}</td>
                <td className="py-2 pr-4 text-antreva-navy">
                  {o.paymentMethod ? PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod : "—"}
                </td>
                <td className="py-2 pr-4">
                  <span
                    className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${
                      STATUS_CLASSES[o.status as OrderStatus] ?? "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <OrderInvoiceModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </>
  );
}
