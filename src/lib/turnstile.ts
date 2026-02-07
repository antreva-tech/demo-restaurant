/**
 * Server-side Cloudflare Turnstile token verification.
 *
 * Validates a Turnstile response token against the Cloudflare Siteverify API.
 * Gracefully degrades: when TURNSTILE_SECRET_KEY is not configured, verification
 * is skipped and all requests are allowed (rate limiting still applies).
 *
 * @see https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface SiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Returns true if Turnstile is configured (secret key is set).
 * When false, callers should skip verification.
 */
export function isTurnstileEnabled(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY?.trim();
}

/**
 * Verifies a Turnstile response token server-side.
 *
 * @param token - The `cf-turnstile-response` token from the client widget.
 * @param remoteIp - Optional client IP for additional validation.
 * @returns `{ success: true }` or `{ success: false, error: string }`.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string
): Promise<{ success: true } | { success: false; error: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  // Graceful degradation: if no secret key, skip verification.
  if (!secret) return { success: true };

  if (!token?.trim()) {
    return { success: false, error: "Verificación anti-bot requerida." };
  }

  try {
    const body: Record<string, string> = {
      secret,
      response: token,
    };
    if (remoteIp) body.remoteip = remoteIp;

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    });

    if (!res.ok) {
      console.warn("Turnstile siteverify HTTP error:", res.status);
      // Fail open on transient Cloudflare errors to avoid blocking real customers.
      return { success: true };
    }

    const data = (await res.json()) as SiteverifyResponse;

    if (!data.success) {
      return {
        success: false,
        error: "Verificación anti-bot fallida. Intente de nuevo.",
      };
    }

    return { success: true };
  } catch {
    // Fail open on network errors to avoid blocking real customers.
    console.warn("Turnstile verification: network error, allowing request");
    return { success: true };
  }
}
