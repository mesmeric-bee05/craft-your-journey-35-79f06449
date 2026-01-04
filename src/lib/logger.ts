/**
 * Environment-aware Logger Utility
 * 
 * SECURITY: Prevents sensitive information from being logged in production
 * - Only logs detailed errors in development
 * - Sanitizes data before logging
 * - Provides consistent logging interface
 */

const isDev = import.meta.env.DEV;

interface LogContext {
  [key: string]: unknown;
}

/**
 * Sanitize sensitive data from log context
 * Removes passwords, tokens, and other sensitive fields
 */
function sanitize(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  
  const sensitiveKeys = [
    'password', 'token', 'secret', 'apiKey', 'api_key',
    'authorization', 'auth', 'credential', 'key'
  ];
  
  const sanitized: LogContext = {};
  
  for (const [key, value] of Object.entries(context)) {
    const keyLower = key.toLowerCase();
    
    if (sensitiveKeys.some(sk => keyLower.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value as LogContext);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export const logger = {
  /**
   * Log errors - always logs in dev, minimal in prod
   */
  error: (message: string, error?: unknown, context?: LogContext): void => {
    if (isDev) {
      console.error(`[ERROR] ${message}`, error, sanitize(context));
    } else {
      // In production, only log error message without stack trace
      console.error(`[ERROR] ${message}`);
    }
  },

  /**
   * Log warnings - only in development
   */
  warn: (message: string, context?: LogContext): void => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, sanitize(context));
    }
  },

  /**
   * Log info - only in development
   */
  info: (message: string, context?: LogContext): void => {
    if (isDev) {
      console.log(`[INFO] ${message}`, sanitize(context));
    }
  },

  /**
   * Log debug - only in development
   */
  debug: (message: string, context?: LogContext): void => {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, sanitize(context));
    }
  },

  /**
   * Log security events - always logs for audit purposes
   */
  security: (event: string, context?: LogContext): void => {
    console.log(`[SECURITY] ${event}`, sanitize(context));
  },
};
