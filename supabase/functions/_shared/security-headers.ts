/**
 * Security Headers for Edge Functions
 * 
 * SECURITY: Apply these headers to all responses for defense in depth
 */

/**
 * Content Security Policy directives for Edge Function responses
 * Provides XSS protection and controls resource loading
 */
export const cspDirectives: Record<string, string> = {
  "default-src": "'self'",
  "script-src": "'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src": "'self' 'unsafe-inline'",
  "img-src": "'self' data: https: blob:",
  "font-src": "'self' data:",
  "connect-src": "'self' https://*.supabase.co wss://*.supabase.co https://ai.gateway.lovable.dev",
  "frame-ancestors": "'none'",
  "form-action": "'self'",
  "base-uri": "'self'",
  "object-src": "'none'",
  "upgrade-insecure-requests": "",
};

/**
 * Generate CSP header string from directives
 */
export function getCSPHeader(): string {
  return Object.entries(cspDirectives)
    .map(([key, value]) => (value ? `${key} ${value}` : key))
    .join('; ');
}

/**
 * Standard security headers for API responses
 * Includes Content Security Policy for comprehensive protection
 */
export const securityHeaders = {
  'Content-Security-Policy': getCSPHeader(),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Get CORS headers with security headers included
 * 
 * @param allowedOrigins - Array of allowed origins (or '*' for public APIs)
 * @param requestOrigin - The origin from the request
 */
export function getCorsHeaders(
  allowedOrigins: string[] | '*',
  requestOrigin?: string | null
): Record<string, string> {
  let origin: string;
  
  if (allowedOrigins === '*') {
    origin = '*';
  } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    origin = requestOrigin;
  } else {
    // Fallback to first allowed origin
    origin = allowedOrigins[0] || '';
  }
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    ...securityHeaders,
  };
}

/**
 * Create response with security headers
 */
export function secureResponse(
  body: string,
  status: number,
  corsHeaders: Record<string, string>,
  additionalHeaders?: Record<string, string>
): Response {
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders,
      ...securityHeaders,
      'Content-Type': 'application/json',
      ...additionalHeaders,
    },
  });
}
