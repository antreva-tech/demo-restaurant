/**
 * Zod schemas and types for payment provider configs.
 * Used in admin form validation and adapter inputs (server-only for decrypted config).
 */

import { z } from "zod";

/** Manual terminal: no secrets, optional label. */
export const manualTerminalConfigSchema = z.object({
  label: z.string().optional(),
});

export type ManualTerminalConfig = z.infer<typeof manualTerminalConfigSchema>;

/** CardNET link/checkout config (placeholder for future API). */
export const cardNetLinkConfigSchema = z.object({
  environment: z.enum(["sandbox", "production"]),
  merchantId: z.string().min(1, "Merchant ID es requerido"),
  apiKey: z.string().min(1, "API Key es requerido"),
  secretKey: z.string().min(1, "Secret Key es requerido"),
  callbackUrl: z.string().url().optional(),
  webhookSecret: z.string().optional(),
});

export type CardNetLinkConfig = z.infer<typeof cardNetLinkConfigSchema>;

/** AZUL link/checkout config (placeholder for future API). */
export const azulLinkConfigSchema = z.object({
  environment: z.enum(["sandbox", "production"]),
  merchantId: z.string().min(1, "Merchant ID es requerido"),
  apiKey: z.string().min(1, "API Key es requerido"),
  secretKey: z.string().min(1, "Secret Key es requerido"),
  callbackUrl: z.string().url().optional(),
  webhookSecret: z.string().optional(),
});

export type AzulLinkConfig = z.infer<typeof azulLinkConfigSchema>;

/** CardNET terminal config (placeholder). */
export const cardNetTerminalConfigSchema = z.object({
  label: z.string().optional(),
});

export type CardNetTerminalConfig = z.infer<typeof cardNetTerminalConfigSchema>;

/** AZUL terminal config (placeholder). */
export const azulTerminalConfigSchema = z.object({
  label: z.string().optional(),
});

export type AzulTerminalConfig = z.infer<typeof azulTerminalConfigSchema>;

/** Union of all provider+type configs for validation. */
export function getConfigSchema(
  provider: "CARDNET" | "AZUL" | "MANUAL",
  type: "CARD_LINK" | "TERMINAL"
): z.ZodType<object> {
  if (provider === "MANUAL") {
    return manualTerminalConfigSchema;
  }
  if (provider === "CARDNET") {
    return type === "CARD_LINK" ? cardNetLinkConfigSchema : cardNetTerminalConfigSchema;
  }
  if (provider === "AZUL") {
    return type === "CARD_LINK" ? azulLinkConfigSchema : azulTerminalConfigSchema;
  }
  return z.object({});
}
