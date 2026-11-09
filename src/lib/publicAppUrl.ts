const CANONICAL_APP_URL = 'https://craft-your-journey-35.lovable.app';

/**
 * Return the public origin that Supabase should use for auth callbacks.
 * A configured URL wins; otherwise preview/Vercel hosts are normalized to the
 * canonical Lovable deployment so OAuth and recovery links do not land on an
 * unrelated preview shell.
 */
export function getPublicAppOrigin(): string {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'craft-your-journey-35.lovable.app' || hostname.endsWith('.lovable.app')) {
      return window.location.origin;
    }
  }

  return CANONICAL_APP_URL;
}
