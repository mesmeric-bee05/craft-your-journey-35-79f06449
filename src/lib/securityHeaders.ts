/**
 * Security headers diagnostics
 *
 * Verifies that critical security response headers are present on the
 * deployed site. Used by the Settings → Security panel and exercised by a
 * lightweight Vitest in staging.
 */

export interface HeaderCheck {
  name: string;
  required: boolean;
  /** Returns null when the header passes, or an error string when it doesn't. */
  validate: (value: string | null) => string | null;
}

export interface HeaderDiagnostic {
  name: string;
  value: string | null;
  ok: boolean;
  required: boolean;
  message: string;
}

export const SECURITY_HEADER_CHECKS: HeaderCheck[] = [
  {
    name: 'content-security-policy',
    required: true,
    validate: (v) => {
      if (!v) return 'Missing Content-Security-Policy';
      const required = ["default-src", "script-src", "frame-ancestors", "object-src"];
      const missing = required.filter((d) => !v.includes(d));
      return missing.length ? `CSP missing directives: ${missing.join(', ')}` : null;
    },
  },
  {
    name: 'x-content-type-options',
    required: true,
    validate: (v) => (v?.toLowerCase() === 'nosniff' ? null : 'Expected "nosniff"'),
  },
  {
    name: 'referrer-policy',
    required: true,
    validate: (v) => (v ? null : 'Missing Referrer-Policy'),
  },
  {
    name: 'x-frame-options',
    required: false,
    validate: (v) => {
      if (!v) return 'Missing X-Frame-Options (CSP frame-ancestors recommended)';
      const upper = v.toUpperCase();
      return upper === 'DENY' || upper === 'SAMEORIGIN' ? null : `Unexpected value: ${v}`;
    },
  },
  {
    name: 'strict-transport-security',
    required: false,
    validate: (v) => (v && /max-age=\d+/i.test(v) ? null : 'Missing HSTS max-age'),
  },
];

/**
 * Inspect headers from a Headers object (e.g. fetch response or
 * synthesized from <meta http-equiv="..."> tags).
 */
export function diagnoseHeaders(headers: Headers | Record<string, string | null>): HeaderDiagnostic[] {
  const get = (name: string): string | null => {
    if (headers instanceof Headers) return headers.get(name);
    const lower = name.toLowerCase();
    for (const k of Object.keys(headers)) {
      if (k.toLowerCase() === lower) return headers[k];
    }
    return null;
  };

  return SECURITY_HEADER_CHECKS.map((check) => {
    const value = get(check.name);
    const error = check.validate(value);
    return {
      name: check.name,
      value,
      required: check.required,
      ok: error === null,
      message: error ?? 'OK',
    };
  });
}

/**
 * Collect <meta http-equiv="..."> elements as a header-like map.
 * Used in the browser when the page can't introspect real response headers.
 */
export function collectMetaHeaders(doc: Document = document): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  doc.querySelectorAll('meta[http-equiv]').forEach((el) => {
    const name = el.getAttribute('http-equiv');
    const content = el.getAttribute('content');
    if (name) out[name.toLowerCase()] = content;
  });
  const ref = doc.querySelector('meta[name="referrer"]');
  if (ref) out['referrer-policy'] = ref.getAttribute('content');
  return out;
}

/** Fetch the current document URL and inspect real response headers. */
export async function fetchAndDiagnose(url: string = window.location.href): Promise<HeaderDiagnostic[]> {
  const res = await fetch(url, { method: 'GET', credentials: 'omit', cache: 'no-store' });
  return diagnoseHeaders(res.headers);
}
