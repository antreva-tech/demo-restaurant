import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Builds the Content-Security-Policy header value with a per-request nonce.
 *
 * Script-src uses nonce + strict-dynamic for CSP Level 3 browsers.
 * 'unsafe-inline' is kept as a fallback for CSP Level 2 — browsers that
 * understand nonces automatically ignore 'unsafe-inline' (spec behaviour).
 * 'unsafe-eval' is only included in development for Hot Module Replacement.
 *
 * Style-src keeps 'unsafe-inline' because Next.js injects inline styles
 * (fonts, image placeholders) that don't carry nonce attributes.
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";

  const directives: string[] = [
    "default-src 'self'",
    [
      "script-src 'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // Fallback for CSP2 browsers; ignored when nonce is supported.
      "'unsafe-inline'",
      // Only needed for Next.js Fast Refresh / HMR in dev.
      isDev ? "'unsafe-eval'" : "",
    ]
      .filter(Boolean)
      .join(" "),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com https://*.public.blob.vercel-storage.com",
    "font-src 'self' data:",
    "connect-src 'self' https://api.resend.com https://api.twilio.com https://challenges.cloudflare.com",
    // Allow Turnstile iframe for CAPTCHA widget.
    "frame-src 'self' https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}

/**
 * Middleware: generates a per-request nonce, sets nonce-based CSP and
 * standard security headers on all matched routes.
 *
 * Auth protection remains in layouts/pages via auth() (Node runtime)
 * to stay under Vercel Edge 1 MB limit.
 */
export function middleware(request: NextRequest) {
  // Generate a cryptographic nonce unique to this request.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  // Forward nonce to server components via request header.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // --- Security Headers ---
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     * Also skip prefetch requests — they don't render HTML.
     */
    {
      source:
        "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
