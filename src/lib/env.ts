/**
 * Central env validation and exports. Fails fast with clear errors when required vars are missing.
 * Required at runtime: DATABASE_URL, NEXTAUTH_SECRET or AUTH_SECRET, NEXTAUTH_URL.
 * Copy .env.example to .env.local and fill in values.
 */

const NODE_ENV = process.env.NODE_ENV;
const isTest = NODE_ENV === "test";

function getRequired(key: string, alt?: string): string {
  const value = process.env[key] ?? (alt ? process.env[alt] : undefined);
  if (!value || (typeof value === "string" && value.trim() === "")) {
    const names = alt ? `${key} or ${alt}` : key;
    throw new Error(
      `[env] Missing required env: ${names}. Add it to .env.local (see .env.example).`
    );
  }
  return value;
}

function getOptional(key: string, fallback: string): string {
  const value = process.env[key];
  return (value?.trim() ?? fallback) || fallback;
}

/** Validates required env vars. Call once at app load; throws if invalid. */
export function validateEnv(): void {
  if (isTest) return;
  getRequired("DATABASE_URL");
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret?.trim()) {
    throw new Error(
      "[env] Missing NEXTAUTH_SECRET or AUTH_SECRET. Add one to .env.local (e.g. run: openssl rand -base64 32)."
    );
  }
  getRequired("NEXTAUTH_URL");
}

/** Auth secret for JWT signing (NEXTAUTH_SECRET or AUTH_SECRET). */
export const authSecret =
  process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim() || undefined;

/**
 * Ensures a valid URL for Auth.js. If only hostname is set (e.g. on Vercel), prepends https://.
 * Also patches process.env.NEXTAUTH_URL so NextAuth and other libs that read it get a valid URL.
 */
function normalizeAuthUrl(raw: string | undefined): string | undefined {
  const s = raw?.trim();
  if (!s) return undefined;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

const rawAuthUrl = process.env.NEXTAUTH_URL?.trim();
const normalized = normalizeAuthUrl(rawAuthUrl);
if (rawAuthUrl && normalized && rawAuthUrl !== normalized) {
  process.env.NEXTAUTH_URL = normalized;
}

/** Canonical app URL for Auth.js (e.g. http://localhost:3000). Hostname-only is normalized to https://. */
export const nextAuthUrl = normalized;

/** Seed script: owner email (optional). */
export const seedOwnerEmail = getOptional("SEED_OWNER_EMAIL", "owner@demo.com");

/** Seed script: owner password (optional). */
export const seedOwnerPassword = getOptional("SEED_OWNER_PASSWORD", "changeme");

// Run validation when this module is first imported (except in tests).
if (!isTest) {
  validateEnv();
}
