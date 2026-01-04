/**
 * Rate Limiting Implementation for Edge Functions
 * Uses sliding window algorithm with in-memory storage
 * 
 * SECURITY: Apply rate limiting to prevent abuse and DoS attacks
 * 
 * Note: In production, consider using Redis or Supabase KV for persistence
 * across function instances. This in-memory implementation works for
 * single-instance scenarios and provides basic protection.
 */

interface RateLimitConfig {
  windowMs: number;      // Window size in milliseconds
  maxRequests: number;   // Max requests per window
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory storage (per function instance)
const ipLimitStore = new Map<string, RateLimitEntry>();
const userLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanupStores() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  
  for (const [key, entry] of ipLimitStore.entries()) {
    if (entry.resetAt < now) {
      ipLimitStore.delete(key);
    }
  }
  
  for (const [key, entry] of userLimitStore.entries()) {
    if (entry.resetAt < now) {
      userLimitStore.delete(key);
    }
  }
}

/**
 * Check rate limit for a given key
 * Returns { allowed, remaining, resetAt }
 */
function checkLimit(
  store: Map<string, RateLimitEntry>,
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupStores();
  
  const now = Date.now();
  const entry = store.get(key);
  
  if (!entry || entry.resetAt < now) {
    // Create new window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    store.set(key, newEntry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }
  
  // Check if within limit
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  
  // Increment count
  entry.count++;
  store.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Extract client IP from request
 * Handles common proxy headers
 */
function getClientIP(req: Request): string {
  // Check common headers in order of preference
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }
  
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  // Fallback to unknown
  return 'unknown';
}

export interface RateLimitResult {
  allowed: boolean;
  response?: Response;
  headers: Record<string, string>;
}

export interface RateLimitOptions {
  ipLimit?: RateLimitConfig;
  userLimit?: RateLimitConfig;
  keyPrefix: string;
}

// Default rate limits
export const DEFAULT_LIMITS = {
  // Standard API endpoints
  standard: {
    ipLimit: { windowMs: 60000, maxRequests: 30 },    // 30/min per IP
    userLimit: { windowMs: 60000, maxRequests: 60 },  // 60/min per user
  },
  // AI/Generation endpoints (more expensive)
  ai: {
    ipLimit: { windowMs: 60000, maxRequests: 20 },    // 20/min per IP
    userLimit: { windowMs: 60000, maxRequests: 50 },  // 50/min per user
  },
  // Sensitive operations
  sensitive: {
    ipLimit: { windowMs: 3600000, maxRequests: 5 },   // 5/hour per IP
    userLimit: { windowMs: 3600000, maxRequests: 3 }, // 3/hour per user
  },
};

/**
 * Apply rate limiting to a request
 * 
 * @param req - The incoming request
 * @param userId - Optional user ID for user-based limiting
 * @param options - Rate limit configuration
 * @param corsHeaders - CORS headers to include in response
 */
export function rateLimit(
  req: Request,
  userId: string | null,
  options: RateLimitOptions,
  corsHeaders: Record<string, string>
): RateLimitResult {
  const ip = getClientIP(req);
  const rateLimitHeaders: Record<string, string> = {};
  
  // Check IP-based limit
  if (options.ipLimit) {
    const ipKey = `${options.keyPrefix}:ip:${ip}`;
    const ipResult = checkLimit(ipLimitStore, ipKey, options.ipLimit);
    
    rateLimitHeaders['X-RateLimit-Limit'] = String(options.ipLimit.maxRequests);
    rateLimitHeaders['X-RateLimit-Remaining'] = String(ipResult.remaining);
    rateLimitHeaders['X-RateLimit-Reset'] = String(Math.ceil(ipResult.resetAt / 1000));
    
    if (!ipResult.allowed) {
      const retryAfter = Math.ceil((ipResult.resetAt - Date.now()) / 1000);
      
      return {
        allowed: false,
        headers: rateLimitHeaders,
        response: new Response(
          JSON.stringify({
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests. Please try again later.',
              retryAfter,
            },
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              ...rateLimitHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
            },
          }
        ),
      };
    }
  }
  
  // Check user-based limit (if authenticated)
  if (userId && options.userLimit) {
    const userKey = `${options.keyPrefix}:user:${userId}`;
    const userResult = checkLimit(userLimitStore, userKey, options.userLimit);
    
    // Override with user-specific limits
    rateLimitHeaders['X-RateLimit-Limit'] = String(options.userLimit.maxRequests);
    rateLimitHeaders['X-RateLimit-Remaining'] = String(userResult.remaining);
    rateLimitHeaders['X-RateLimit-Reset'] = String(Math.ceil(userResult.resetAt / 1000));
    
    if (!userResult.allowed) {
      const retryAfter = Math.ceil((userResult.resetAt - Date.now()) / 1000);
      
      return {
        allowed: false,
        headers: rateLimitHeaders,
        response: new Response(
          JSON.stringify({
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests. Please try again later.',
              retryAfter,
            },
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              ...rateLimitHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
            },
          }
        ),
      };
    }
  }
  
  return { allowed: true, headers: rateLimitHeaders };
}
