/**
 * Resolves the post-sign-in destination from a `next` query parameter.
 * Only same-origin relative paths are accepted so the parameter can't be used
 * to bounce a signed-in user to another site.
 */
export function safeNextPath(search: string, fallback = "/dashboard"): string {
  const raw = new URLSearchParams(search).get("next");
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}
