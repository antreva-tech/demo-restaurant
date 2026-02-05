import siteJson from "@/config/site.json";

/**
 * Public site config. Content from src/config/site.json; only WhatsApp from env (optional, per-environment).
 */

const rawWhatsApp =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim()) || "";

/** E.164 digits only; empty if not set or invalid. */
const whatsappNumber = rawWhatsApp.replace(/\D/g, "");

/** Base WhatsApp URL for wa.me. Empty if no number. */
export const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "";

export const siteConfig = {
  siteName: siteJson.siteName,
  menuPath: siteJson.menuPath,
  tagline: siteJson.tagline,
  description: siteJson.description,
  hours: siteJson.hours ?? "",
  hasHours: !!(siteJson.hours && String(siteJson.hours).trim()),
  copyrightName: siteJson.copyrightName,
  logoUrl: siteJson.logoUrl ?? "",
  heroImageUrl: siteJson.heroImageUrl ?? "",
  experienceImageUrl: siteJson.experienceImageUrl ?? "",
  whatsappNumber,
  whatsappUrl,
  hasWhatsApp: !!whatsappNumber,
} as const;
