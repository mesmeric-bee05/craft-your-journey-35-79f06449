/**
 * Client-side rate limiter for form submissions and API calls
 * Prevents rapid-fire requests from the browser
 */

const attempts = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if an action is rate limited
 * @param key Unique identifier for the action (e.g., 'login', 'forgot-password')
 * @param maxAttempts Maximum attempts within the window
 * @param windowMs Time window in milliseconds (default: 60s)
 * @returns { allowed: boolean; retryAfterMs: number }
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number = 60_000
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now >= entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Reset rate limit for a key (e.g., after successful login)
 */
export function resetRateLimit(key: string): void {
  attempts.delete(key);
}
