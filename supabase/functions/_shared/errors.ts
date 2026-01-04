/**
 * Standardized Error Response Utilities
 * 
 * SECURITY: Consistent error responses prevent information leakage
 * - Never expose internal error details to clients
 * - Use standardized error codes for client handling
 * - Log detailed errors server-side only
 */

export interface ErrorDetails {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  corsHeaders: Record<string, string>,
  details?: unknown
): Response {
  const body: { error: ErrorDetails } = {
    error: {
      code,
      message,
    },
  };
  
  if (details) {
    body.error.details = details;
  }
  
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

// Common error responses

export function badRequest(
  message: string, 
  corsHeaders: Record<string, string>,
  details?: unknown
): Response {
  return errorResponse(400, 'BAD_REQUEST', message, corsHeaders, details);
}

export function unauthorized(
  corsHeaders: Record<string, string>,
  message = 'Authentication required'
): Response {
  return errorResponse(401, 'UNAUTHORIZED', message, corsHeaders);
}

export function forbidden(
  corsHeaders: Record<string, string>,
  message = 'You do not have access to this resource'
): Response {
  return errorResponse(403, 'FORBIDDEN', message, corsHeaders);
}

export function notFound(
  corsHeaders: Record<string, string>,
  message = 'Resource not found'
): Response {
  return errorResponse(404, 'NOT_FOUND', message, corsHeaders);
}

export function rateLimited(
  corsHeaders: Record<string, string>,
  retryAfter: number
): Response {
  return new Response(
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
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}

export function internalError(
  corsHeaders: Record<string, string>,
  message = 'An unexpected error occurred'
): Response {
  // SECURITY: Never expose internal error details to clients
  return errorResponse(500, 'INTERNAL_ERROR', message, corsHeaders);
}

/**
 * Safely log errors with context
 * SECURITY: Only logs to server, never exposes to client
 */
export function logError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error(`[ERROR] ${context}:`, {
    message: errorMessage,
    stack: errorStack,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log security-related events for audit
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, unknown>
): void {
  console.log(`[SECURITY] ${event}:`, {
    ...details,
    timestamp: new Date().toISOString(),
  });
}
