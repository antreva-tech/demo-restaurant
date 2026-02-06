"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { encryptJson } from "@/lib/crypto";
import { getConfigSchema } from "@/lib/payments/types";
import type { PaymentProvider, PaymentIntegrationType } from "@prisma/client";

/** Payload for create/update; config is plain object (will be encrypted). */
export interface IntegrationPayload {
  name: string;
  type: PaymentIntegrationType;
  provider: PaymentProvider;
  locationId: string | null;
  isEnabled: boolean;
  config: Record<string, unknown>;
}

/** For edit: optional config keys to replace (e.g. secretKey); if not sent, keep existing. */
export interface UpdateIntegrationPayload extends IntegrationPayload {
  replaceSecretKeys?: string[];
}

async function getRestaurantId(): Promise<string | null> {
  const session = await auth();
  return (session as { restaurantId?: string })?.restaurantId ?? null;
}

const SECRET_KEYS = ["apiKey", "secretKey", "webhookSecret"];
const MASKED_PLACEHOLDER = "••••••";

function maskConfig(config: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(config)) {
    out[k] = SECRET_KEYS.includes(k)
      ? MASKED_PLACEHOLDER
      : String(v ?? "");
  }
  return out;
}

export async function getIntegrationsForAdmin() {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return { error: "No autorizado", integrations: null };

  const integrations = await prisma.paymentIntegration.findMany({
    where: { restaurantId },
    include: { location: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return { integrations };
}

/** Returns integration plus config with secrets masked for admin edit form. */
export async function getIntegrationForEdit(integrationId: string) {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return { error: "No autorizado", integration: null, configMasked: null };

  const integration = await prisma.paymentIntegration.findFirst({
    where: { id: integrationId, restaurantId },
    include: { location: { select: { id: true, name: true } } },
  });
  if (!integration) return { error: "Integración no encontrada", integration: null, configMasked: null };

  const { decryptJson } = await import("@/lib/crypto");
  const config = decryptJson(integration.configEncrypted) as Record<string, unknown>;
  const configMasked = maskConfig(config);
  return { integration, configMasked };
}

export async function createIntegration(payload: IntegrationPayload) {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return { error: "No autorizado" };

  const schema = getConfigSchema(payload.provider, payload.type);
  const parsed = schema.safeParse(payload.config);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg = Object.values(first).flat().join(" ") || "Configuración inválida";
    return { error: msg };
  }

  const configEncrypted = encryptJson(parsed.data);

  try {
    await prisma.paymentIntegration.create({
      data: {
        restaurantId,
        locationId: payload.locationId || null,
        provider: payload.provider,
        type: payload.type,
        name: payload.name.trim(),
        isEnabled: payload.isEnabled,
        configEncrypted,
      },
    });
    revalidatePath("/admin/pagos");
    revalidatePath("/pos");
    return { ok: true };
  } catch {
    return { error: "Error al crear la integración" };
  }
}

export async function updateIntegration(
  integrationId: string,
  payload: UpdateIntegrationPayload
) {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return { error: "No autorizado" };

  const existing = await prisma.paymentIntegration.findFirst({
    where: { id: integrationId, restaurantId },
  });
  if (!existing) return { error: "Integración no encontrada" };

  const schema = getConfigSchema(payload.provider, payload.type);
  let configToStore = payload.config;
  if (payload.replaceSecretKeys?.length) {
    const parsed = schema.safeParse(payload.config);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat().join(" ") || "Configuración inválida";
      return { error: msg };
    }
    configToStore = parsed.data as Record<string, unknown>;
  } else {
    const { decryptJson } = await import("@/lib/crypto");
    const current = decryptJson(existing.configEncrypted) as Record<string, unknown>;
    const secretKeys = ["apiKey", "secretKey", "webhookSecret"];
    const maskedPattern = /^•+$/;
    configToStore = { ...current };
    for (const [k, v] of Object.entries(payload.config)) {
      if (secretKeys.includes(k) && typeof v === "string" && maskedPattern.test(v.trim())) continue;
      (configToStore as Record<string, unknown>)[k] = v;
    }
    const parsed = schema.safeParse(configToStore);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat().join(" ") || "Configuración inválida";
      return { error: msg };
    }
    configToStore = parsed.data as Record<string, unknown>;
  }

  const configEncrypted = encryptJson(configToStore);

  try {
    await prisma.paymentIntegration.update({
      where: { id: integrationId },
      data: {
        locationId: payload.locationId || null,
        provider: payload.provider,
        type: payload.type,
        name: payload.name.trim(),
        isEnabled: payload.isEnabled,
        configEncrypted,
      },
    });
    revalidatePath("/admin/pagos");
    revalidatePath("/pos");
    return { ok: true };
  } catch {
    return { error: "Error al actualizar la integración" };
  }
}

export async function toggleIntegration(
  integrationId: string,
  isEnabled: boolean
) {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return { error: "No autorizado" };

  const updated = await prisma.paymentIntegration.updateMany({
    where: { id: integrationId, restaurantId },
    data: { isEnabled },
  });
  if (updated.count === 0) return { error: "Integración no encontrada" };
  revalidatePath("/admin/pagos");
  revalidatePath("/pos");
  return { ok: true };
}

export async function deleteIntegration(integrationId: string) {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return { error: "No autorizado" };

  const deleted = await prisma.paymentIntegration.deleteMany({
    where: { id: integrationId, restaurantId },
  });
  if (deleted.count === 0) return { error: "Integración no encontrada" };
  revalidatePath("/admin/pagos");
  revalidatePath("/pos");
  return { ok: true };
}

/** Returns enabled integrations for POS (by location). Used by POS to show payment options. */
export async function getIntegrationsForPos(locationId: string) {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return { error: "No autorizado", cardLink: [], terminal: [] };
  const { getEnabledIntegrationsForPos } = await import("@/server/payments/providers/registry");
  const result = await getEnabledIntegrationsForPos(restaurantId, locationId);
  return { cardLink: result.cardLink, terminal: result.terminal };
}

/** Returns decrypted config for server-only use (e.g. adapter). Never send to client. */
export async function getIntegrationConfig(
  integrationId: string
): Promise<{ config: Record<string, unknown>; integration: { provider: PaymentProvider; type: PaymentIntegrationType; restaurantId: string; locationId: string | null } } | null> {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return null;

  const integration = await prisma.paymentIntegration.findFirst({
    where: { id: integrationId, restaurantId },
  });
  if (!integration?.isEnabled) return null;

  const { decryptJson } = await import("@/lib/crypto");
  const config = decryptJson(integration.configEncrypted) as Record<string, unknown>;
  return {
    config,
    integration: {
      provider: integration.provider,
      type: integration.type,
      restaurantId: integration.restaurantId,
      locationId: integration.locationId,
    },
  };
}
