const CANONICAL_APP_URL = 'https://craft-your-journey-35.lovable.app';

/**
 * Return the public origin that Supabase should use for auth callbacks.
 * A configured URL wins; otherwise preview/Vercel hosts are normalized to the
 * canonical Lovable deployment so OAuth and recovery links do not land on an
 * unrelated preview shell.
 */
export function getPublicAppOrigin(): string {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (configured) {
    try {
      const configuredUrl = new URL(configured);
      const isApprovedOrigin = configuredUrl.protocol === 'https:' &&
        (configuredUrl.hostname === 'craft-your-journey-35.lovable.app' || configuredUrl.hostname.endsWith('.lovable.app'));
      if (isApprovedOrigin) return configured;
    } catch {
      // Ignore malformed or unapproved deployment URLs and use the canonical origin.
    }
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'craft-your-journey-35.lovable.app' || hostname.endsWith('.lovable.app')) {
      return window.location.origin;
    }
  }

  return CANONICAL_APP_URL;
}
