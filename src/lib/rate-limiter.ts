/**
 * In-memory sliding-window rate limiter for sensitive endpoints (e.g. login, recovery).
 * Automatically cleans up expired windows to prevent memory leaks.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

// Clean up expired entries every 60 seconds
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = Date.now();

function purgeExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of store.entries()) {
    if (record.resetAt <= now) {
      store.delete(key);
    }
  }
}

export interface RateLimitOptions {
  /** Time window in milliseconds (e.g., 5 * 60 * 1000 = 5 minutes) */
  windowMs: number;
  /** Maximum attempts allowed in this window */
  maxAttempts: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
}

/**
 * Checks and increments the attempt count for a given identifier.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 5 * 60 * 1000, maxAttempts: 5 }
): RateLimitResult {
  purgeExpired();

  const now = Date.now();
  const existing = store.get(identifier);

  if (!existing || existing.resetAt <= now) {
    // New or expired window
    const resetAt = now + options.windowMs;
    store.set(identifier, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, options.maxAttempts - 1),
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
      resetAt,
    };
  }

  // Active window
  existing.count += 1;
  const allowed = existing.count <= options.maxAttempts;
  const remaining = Math.max(0, options.maxAttempts - existing.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  return {
    allowed,
    remaining,
    retryAfterSeconds,
    resetAt: existing.resetAt,
  };
}

/**
 * Resets the rate limit counter for an identifier (e.g., after successful login).
 */
export function resetRateLimit(identifier: string): void {
  store.delete(identifier);
}

/**
 * Extracts a best-effort client IP from common proxy and CDN headers.
 */
export function getClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0];
    if (first) return first.trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}
