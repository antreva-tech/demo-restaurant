"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { createIntegration, updateIntegration, getIntegrationForEdit } from "@/server/actions/payment-integrations";
import type { PaymentProvider, PaymentIntegrationType } from "@prisma/client";

type IntegrationRow = {
  id: string;
  name: string;
  provider: PaymentProvider;
  type: PaymentIntegrationType;
  isEnabled: boolean;
  locationId: string | null;
  location: { id: string; name: string } | null;
};

const PROVIDER_OPTIONS: { value: PaymentProvider; label: string }[] = [
  { value: "MANUAL", label: "Manual" },
  { value: "CARDNET", label: "CardNET" },
  { value: "AZUL", label: "AZUL" },
];

const TYPE_OPTIONS: { value: PaymentIntegrationType; label: string }[] = [
  { value: "TERMINAL", label: "Terminal" },
  { value: "CARD_LINK", label: "Link/QR" },
];

interface IntegrationFormModalProps {
  integration: IntegrationRow | null;
  locations: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

export function IntegrationFormModal({
  integration,
  locations,
  onClose,
  onSuccess,
}: IntegrationFormModalProps) {
  const isEdit = !!integration;
  const [loading, setLoading] = useState(false);
  const [configMasked, setConfigMasked] = useState<Record<string, string> | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<PaymentIntegrationType>("TERMINAL");
  const [provider, setProvider] = useState<PaymentProvider>("MANUAL");
  const [locationId, setLocationId] = useState<string>("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [replaceSecret, setReplaceSecret] = useState(false);

  useEffect(() => {
    if (isEdit && integration) {
      setName(integration.name);
      setType(integration.type);
      setProvider(integration.provider);
      setLocationId(integration.locationId ?? "");
      setIsEnabled(integration.isEnabled);
      getIntegrationForEdit(integration.id).then((res) => {
        if ("configMasked" in res && res.configMasked) {
          setConfigMasked(res.configMasked);
          setConfig(res.configMasked);
        }
      });
    } else {
      setName("");
      setType("TERMINAL");
      setProvider("MANUAL");
      setLocationId("");
      setIsEnabled(true);
      setConfig({});
      setConfigMasked(null);
    }
  }, [isEdit, integration?.id]);

  const showLinkConfig =
    type === "CARD_LINK" && (provider === "CARDNET" || provider === "AZUL");
  const showManualConfig = provider === "MANUAL" && type === "TERMINAL";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = {
      name: name.trim(),
      type,
      provider,
      locationId: locationId || null,
      isEnabled,
      config: showLinkConfig
        ? {
            environment: config.environment || "sandbox",
            merchantId: config.merchantId ?? "",
            apiKey: config.apiKey ?? "",
            secretKey: config.secretKey ?? "",
            callbackUrl: config.callbackUrl || undefined,
            webhookSecret: config.webhookSecret || undefined,
          }
        : showManualConfig
          ? { label: config.label || undefined }
          : {},
    };

    const res = isEdit
      ? await updateIntegration(integration!.id, payload)
      : await createIntegration(payload);
    setLoading(false);
    if (res?.ok) onSuccess();
    else alert((res as { error?: string })?.error ?? "Error");
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Editar integración" : "Agregar integración"}
      contentClassName="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="name"
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          labelClassName="text-antreva-navy"
          placeholder="Ej. Terminal manual"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-antreva-navy">
            Tipo
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PaymentIntegrationType)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-antreva-navy"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-antreva-navy">
            Proveedor
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as PaymentProvider)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-antreva-navy"
          >
            {PROVIDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-antreva-navy">
            Alcance
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!locationId}
                onChange={() => setLocationId("")}
                className="text-antreva-blue"
              />
              Global (todas las ubicaciones)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!!locationId}
                onChange={() => setLocationId(locations[0]?.id ?? "")}
                className="text-antreva-blue"
              />
              Ubicación específica
            </label>
          </div>
          {locationId && (
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-antreva-navy"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="rounded text-antreva-blue"
          />
          <span className="text-sm font-medium text-antreva-navy">Activo</span>
        </label>

        {showLinkConfig && (
          <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-medium text-antreva-navy">
              Configuración del proveedor (Link/QR)
            </p>
            <select
              value={config.environment ?? "sandbox"}
              onChange={(e) =>
                setConfig((c) => ({ ...c, environment: e.target.value }))
              }
              className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Producción</option>
            </select>
            <Input
              label="Merchant ID"
              value={config.merchantId ?? ""}
              onChange={(e) =>
                setConfig((c) => ({ ...c, merchantId: e.target.value }))
              }
              labelClassName="text-antreva-navy"
            />
            {isEdit && !replaceSecret ? (
              <div className="flex items-center gap-2">
                <Input
                  label="API Key"
                  value={config.apiKey ?? "••••••"}
                  disabled
                  labelClassName="text-antreva-navy"
                />
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={replaceSecret}
                    onChange={(e) => setReplaceSecret(e.target.checked)}
                  />
                  Reemplazar secreto
                </label>
              </div>
            ) : (
              <Input
                label="API Key"
                value={config.apiKey ?? ""}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, apiKey: e.target.value }))
                }
                type="password"
                labelClassName="text-antreva-navy"
              />
            )}
            {isEdit && !replaceSecret ? (
              <Input
                label="Secret Key"
                value={config.secretKey ?? "••••••"}
                disabled
                labelClassName="text-antreva-navy"
              />
            ) : (
              <Input
                label="Secret Key"
                value={config.secretKey ?? ""}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, secretKey: e.target.value }))
                }
                type="password"
                labelClassName="text-antreva-navy"
              />
            )}
            <Input
              label="Callback URL (opcional)"
              value={config.callbackUrl ?? ""}
              onChange={(e) =>
                setConfig((c) => ({ ...c, callbackUrl: e.target.value }))
              }
              labelClassName="text-antreva-navy"
            />
            <Input
              label="Webhook secret (opcional)"
              value={config.webhookSecret ?? ""}
              onChange={(e) =>
                setConfig((c) => ({ ...c, webhookSecret: e.target.value }))
              }
              type="password"
              labelClassName="text-antreva-navy"
            />
          </div>
        )}

        {showManualConfig && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <Input
              label="Etiqueta (opcional)"
              value={config.label ?? ""}
              onChange={(e) =>
                setConfig((c) => ({ ...c, label: e.target.value }))
              }
              labelClassName="text-antreva-navy"
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="gold" disabled={loading}>
            {loading ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
