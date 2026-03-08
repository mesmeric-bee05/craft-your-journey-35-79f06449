/**
 * Sanitization utilities for user inputs to prevent injection attacks
 */

/**
 * Escapes PostgreSQL LIKE/ILIKE special characters to prevent SQL injection
 * in search queries using Supabase's .ilike() or .or() with like patterns
 * 
 * @param input - The raw user input to sanitize
 * @returns The sanitized string safe for use in LIKE/ILIKE patterns
 */
export function sanitizeSearchInput(input: string): string {
  if (!input) return '';
  // Escape PostgreSQL LIKE special characters: % _ \
  return input.replace(/[%_\\]/g, '\\$&');
}

/**
 * Sanitizes a string for safe display, preventing XSS when used with textContent
 * Note: React already escapes JSX content, this is for edge cases
 * 
 * @param input - The raw string to sanitize
 * @returns The sanitized string
 */
export function sanitizeDisplayText(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validates and sanitizes a URL to prevent javascript: and data: protocol injection
 * 
 * @param url - The URL to validate
 * @returns The sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    // Only allow http, https, and mailto protocols
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    // If URL parsing fails, check if it's a relative path
    if (url.startsWith('/') && !url.startsWith('//')) {
      return url;
    }
    return '';
  }
}

/**
 * Strip all HTML tags from a string to prevent XSS in contexts
 * where HTML might be rendered (e.g. notification bodies, email previews)
 * 
 * @param html - The potentially-HTML string to strip
 * @returns Plain text with all tags removed
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/**
 * Sanitizes user input for use in Supabase RPC function parameters
 * Prevents SQL injection in dynamic queries
 * 
 * @param input - The raw input
 * @param maxLength - Maximum allowed length (default 1000)
 * @returns The sanitized and truncated string
 */
export function sanitizeRpcInput(input: string, maxLength: number = 1000): string {
  if (!input) return '';
  // Remove null bytes and truncate
  return input.replace(/\0/g, '').slice(0, maxLength);
}

/**
 * Validate that a file type is in an allowlist
 * Prevents upload of dangerous file types
 */
export function isAllowedFileType(
  mimeType: string,
  allowedTypes: string[] = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain', 'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]
): boolean {
  return allowedTypes.includes(mimeType.toLowerCase());
}

/**
 * Sanitize a filename for safe storage
 * Removes path traversal characters and special chars
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'unnamed';
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255);
}
