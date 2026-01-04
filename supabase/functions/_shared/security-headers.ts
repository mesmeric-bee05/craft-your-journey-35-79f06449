/**
 * Security Headers for Edge Functions
 * 
 * SECURITY: Apply these headers to all responses for defense in depth
 */

/**
 * Standard security headers for API responses
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
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
