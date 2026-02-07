"use client";

import { formatDOP } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { OpenOrderForPos } from "./PosUnpaidOrdersPanel";
import type { EnabledIntegrationsForPos } from "@/server/payments/providers/registry";

interface PosPayOpenOrderModalProps {
  order: OpenOrderForPos;
  restaurant: { allowCash: boolean; allowTransfer: boolean; allowCard: boolean };
  integrations: EnabledIntegrationsForPos;
  onClose: () => void;
  onPayCash: () => void;
  onPayTransfer: () => void;
  onPayCardLink: (integrationId: string) => void;
  onPayCardTerminal: (integrationId: string) => void;
}

/**
 * Modal to choose payment method for an existing OPEN order (from "Órdenes por cobrar").
 * Shows order summary and same payment options as main checkout.
 */
export function PosPayOpenOrderModal({
  order,
  restaurant,
  integrations,
  onClose,
  onPayCash,
  onPayTransfer,
  onPayCardLink,
  onPayCardTerminal,
}: PosPayOpenOrderModalProps) {
  return (
    <Modal open onClose={onClose} title={`Cobrar orden #${order.orderNumber}`}>
      <div className="space-y-4 text-gray-900">
        <div>
          <p className="text-sm text-gray-600">
            {order.customerName || "Sin nombre"} · Total {formatDOP(order.totalCents)}
          </p>
          <ul className="mt-2 text-sm text-gray-700 list-disc list-inside">
            {order.items.map((i) => (
              <li key={i.id}>
                {i.nameSnapshot} × {i.quantity} — {formatDOP(i.lineTotalCents)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-900">Método de pago</label>
          <div className="flex flex-wrap gap-2">
            {restaurant.allowCash && (
              <Button variant="gold" onClick={onPayCash}>
                Efectivo
              </Button>
            )}
            {restaurant.allowTransfer && (
              <Button variant="goldSecondary" onClick={onPayTransfer}>
                Transferencia
              </Button>
            )}
            {restaurant.allowCard && integrations.cardLink.length > 0 && (
              <Button
                variant="goldSecondary"
                onClick={() => onPayCardLink(integrations.cardLink[0].id)}
              >
                Tarjeta (Link/QR)
              </Button>
            )}
            {restaurant.allowCard && integrations.terminal.length > 0 && (
              <Button
                variant="goldSecondary"
                onClick={() => onPayCardTerminal(integrations.terminal[0].id)}
              >
                Tarjeta (Terminal)
              </Button>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
