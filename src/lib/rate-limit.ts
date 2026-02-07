/**
 * Lightweight in-memory rate limiter for server-side use.
 * Suitable for single-instance deployments; for multi-instance, swap to Redis/Upstash.
 *
 * Uses a sliding window counter per identifier (IP, userId, etc.).
 * Stale entries are pruned automatically.
 */

interface RateLimitEntry {
  count: number;
  /** Timestamp (ms) when this window resets. */
  resetAt: number;
}

interface RateLimiterOptions {
  /** Maximum requests allowed within the window. */
  maxRequests: number;
  /** Window duration in seconds. */
  windowSec: number;
}

interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Unix timestamp (ms) when the window resets. */
  resetAt: number;
}

/**
 * Creates a rate limiter instance with its own isolated store.
 * Call `check(identifier)` to test and consume a token.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const store = new Map<string, RateLimitEntry>();
  const { maxRequests, windowSec } = options;
  const windowMs = windowSec * 1000;

  // Prune stale entries every 60 seconds to prevent memory leaks.
  const PRUNE_INTERVAL_MS = 60_000;
  let lastPrune = Date.now();

  function prune() {
    const now = Date.now();
    if (now - lastPrune < PRUNE_INTERVAL_MS) return;
    lastPrune = now;
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }

  /**
   * Checks and consumes a rate limit token for the given identifier.
   * @param identifier - Unique key (e.g. IP address, user ID).
   * @returns Whether the request is allowed and remaining quota.
   */
  function check(identifier: string): RateLimitResult {
    prune();

    const now = Date.now();
    const entry = store.get(identifier);

    // No existing entry or window expired — start fresh window.
    if (!entry || entry.resetAt <= now) {
      const resetAt = now + windowMs;
      store.set(identifier, { count: 1, resetAt });
      return { allowed: true, remaining: maxRequests - 1, resetAt };
    }

    // Within window — check limit.
    if (entry.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count += 1;
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  return { check };
}

/**
 * Extracts the client IP from Next.js headers.
 * Works with `headers()` from `next/headers`.
 * Falls back to "unknown" if no IP is available.
 */
export function getClientIp(headersList: Headers): string {
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = headersList.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
