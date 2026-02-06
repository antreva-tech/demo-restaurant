"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  toggleIntegration,
  deleteIntegration,
} from "@/server/actions/payment-integrations";
import { IntegrationFormModal } from "@/components/admin/IntegrationFormModal";
import type { PaymentProvider, PaymentIntegrationType } from "@prisma/client";

type IntegrationWithLocation = {
  id: string;
  name: string;
  provider: PaymentProvider;
  type: PaymentIntegrationType;
  isEnabled: boolean;
  locationId: string | null;
  location: { id: string; name: string } | null;
};

const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  MANUAL: "Manual",
  CARDNET: "CardNET",
  AZUL: "AZUL",
};

const TYPE_LABELS: Record<PaymentIntegrationType, string> = {
  CARD_LINK: "Link/QR",
  TERMINAL: "Terminal",
};

export function IntegrationsTable({
  integrations,
  locations,
}: {
  integrations: IntegrationWithLocation[];
  locations: { id: string; name: string }[];
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const editIntegration = editId
    ? integrations.find((i) => i.id === editId)
    : null;

  async function handleToggle(id: string, current: boolean) {
    setLoading(id);
    const res = await toggleIntegration(id, !current);
    setLoading(null);
    if (res?.ok) window.location.reload();
    else alert((res as { error?: string })?.error ?? "Error");
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta integración?")) return;
    setLoading(id);
    const res = await deleteIntegration(id);
    setLoading(null);
    if (res?.ok) window.location.reload();
    else alert((res as { error?: string })?.error ?? "Error");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="gold" onClick={() => setAddModalOpen(true)}>
          Agregar integración
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-semibold text-antreva-navy">
                Nombre
              </th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-antreva-navy">
                Proveedor
              </th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-antreva-navy">
                Tipo
              </th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-antreva-navy">
                Alcance
              </th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-antreva-navy">
                Estado
              </th>
              <th className="px-4 py-2 text-right text-sm font-semibold text-antreva-navy">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {integrations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  No hay integraciones. Agregue una para mostrar opciones de pago en la caja.
                </td>
              </tr>
            ) : (
              integrations.map((i) => (
                <tr key={i.id} className="bg-white">
                  <td className="px-4 py-2 text-sm text-gray-900">{i.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {PROVIDER_LABELS[i.provider]}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {TYPE_LABELS[i.type]}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {i.locationId ? i.location?.name ?? "—" : "Global"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        i.isEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {i.isEnabled ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="goldSecondary"
                        size="sm"
                        onClick={() => setEditId(i.id)}
                        disabled={loading !== null}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleToggle(i.id, i.isEnabled)}
                        disabled={loading !== null}
                      >
                        {i.isEnabled ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(i.id)}
                        disabled={loading !== null}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {addModalOpen && (
        <IntegrationFormModal
          integration={null}
          locations={locations}
          onClose={() => setAddModalOpen(false)}
          onSuccess={() => {
            setAddModalOpen(false);
            window.location.reload();
          }}
        />
      )}
      {editIntegration && (
        <IntegrationFormModal
          integration={editIntegration}
          locations={locations}
          onClose={() => setEditId(null)}
          onSuccess={() => {
            setEditId(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
