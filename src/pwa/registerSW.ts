/**
 * Guarded service worker registration.
 * Follows Lovable PWA skill: never register in dev/preview/iframe/kill-switch.
 * The wrapper is the sole registrar (vite-plugin-pwa's injectRegister is null).
 */
const SW_PATH = "/sw.js";

function isLovablePreviewHost(host: string): boolean {
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  return false;
}

async function unregisterExisting() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => (r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "").endsWith(SW_PATH))
        .map((r) => r.unregister()),
    );
  } catch {
    /* noop */
  }
}

export function registerAppSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const inIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const params = new URLSearchParams(window.location.search);
  const killSwitch = params.get("sw") === "off";
  const host = window.location.hostname;

  if (!import.meta.env.PROD || inIframe || killSwitch || isLovablePreviewHost(host)) {
    void unregisterExisting();
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_PATH, { scope: "/" }).catch(() => {
      /* swallow — worker will retry on next load */
    });
  });

  // When SW takes control after an update, refresh once so users get new HTML.
  let refreshed = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshed) return;
    refreshed = true;
    window.location.reload();
  });
}
