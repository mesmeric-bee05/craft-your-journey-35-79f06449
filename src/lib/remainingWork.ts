/**
 * "Remaining work" manifest.
 *
 * Each entry maps a commitment from an approved plan (see `.lovable/plan/`) to
 * the artefacts that implement it, so the admin monitoring shell can show what
 * is done, partially done, or still missing as actionable tasks.
 *
 * Keep this file updated whenever a plan item lands — it is the single source
 * of truth for the in-app checklist (the browser never scans the repo).
 */

export type WorkStatus = "done" | "partial" | "missing";

export interface WorkItem {
  id: string;
  title: string;
  area:
    | "Capital"
    | "Security"
    | "Monitoring"
    | "SACCO"
    | "SEO"
    | "Platform"
    | "Voice & Culture";
  status: WorkStatus;
  /** What still needs doing (empty when done). */
  next?: string;
  /** Where in the app this lives. */
  link?: string;
  /** Plan the commitment came from. */
  source: string;
}

export const REMAINING_WORK: WorkItem[] = [
  // ---------- Voice & Culture ----------
  {
    id: "voice-sync-summary",
    title: "Voice command summarises last webhook + nightly repayment sync",
    area: "Voice & Culture",
    status: "done",
    link: "/capital",
    source: "capital-voice-sync-admin-navigation",
  },
  {
    id: "voice-language-switch",
    title: "English / Kiswahili / Sheng' / Kenglish switch keeps data and actions",
    area: "Voice & Culture",
    status: "done",
    link: "/capital",
    source: "track-b-voice-culture",
  },
  {
    id: "voice-actions",
    title: "Voice-initiated Capital steps always confirm on screen before acting",
    area: "Voice & Culture",
    status: "done",
    link: "/capital",
    source: "track-b-voice-culture",
  },

  // ---------- Capital ----------
  {
    id: "capital-live-disbursement",
    title: "Live M-Pesa B2C disbursement (production Daraja credentials)",
    area: "Capital",
    status: "partial",
    next: "Daraja B2C secrets are configured; run a production smoke disbursement and confirm the callback settles the advance.",
    link: "/admin/capital/ops",
    source: "capital-ops-hardening",
  },
  {
    id: "capital-partner-webhook",
    title: "Partner lender webhook with HMAC verification, replay and idempotency",
    area: "Capital",
    status: "done",
    link: "/admin/capital/ops",
    source: "capital-ops-hardening",
  },
  {
    id: "capital-exports",
    title: "Admin export of each application's timeline and audit log (CSV/PDF)",
    area: "Capital",
    status: "done",
    link: "/admin/capital",
    source: "capital-voice-sync-admin-navigation",
  },
  {
    id: "capital-status-page",
    title: "User-facing Capital application status page",
    area: "Capital",
    status: "done",
    link: "/capital",
    source: "capital-ops-hardening",
  },

  // ---------- Security ----------
  {
    id: "security-rescan",
    title: "Periodic automated security re-scan feeding the findings audit trail",
    area: "Security",
    status: "done",
    link: "/security/findings",
    source: "security-ci-cron-health",
  },
  {
    id: "security-audit-log",
    title: "Audit log of who triggered scans and which findings changed status",
    area: "Security",
    status: "done",
    link: "/admin/monitoring/security",
    source: "capital-voice-sync-admin-navigation",
  },
  {
    id: "security-regression-tests",
    title: "Regression tests: admin-only repayments, atomic wallets, protected callbacks",
    area: "Security",
    status: "done",
    next: undefined,
    link: "/admin/monitoring/security",
    source: "security-verification-and-regression-tests",
  },
  {
    id: "security-email-alerts",
    title: "Email digest to admins on scan completion and finding status changes",
    area: "Security",
    status: "partial",
    next: "Add the RESEND_API_KEY secret so the digest function can deliver mail; in-app alerts already work.",
    link: "/admin/monitoring/security",
    source: "security-verification-and-regression-tests",
  },

  // ---------- Monitoring ----------
  {
    id: "monitoring-shell",
    title: "Unified admin monitoring shell (health, SEO, security tabs)",
    area: "Monitoring",
    status: "done",
    link: "/admin/monitoring/health",
    source: "capital-voice-sync-admin-navigation",
  },
  {
    id: "cron-health",
    title: "pg_cron health dashboard with searchable run timeline and CSV export",
    area: "Monitoring",
    status: "done",
    link: "/admin/monitoring/health",
    source: "security-ci-cron-health",
  },

  // ---------- SEO ----------
  {
    id: "gsc-verification",
    title: "Google Search Console site verification completed",
    area: "SEO",
    status: "partial",
    next: "The property is connected but not verified, so sitemap submissions report \"setup needed\". Finish domain verification in Search Console.",
    link: "/admin/monitoring/seo",
    source: "seo-monitoring-suite",
  },
  {
    id: "seo-route-audit",
    title: "Automated route audit for titles, canonicals, OpenGraph and JSON-LD",
    area: "SEO",
    status: "done",
    link: "/admin/monitoring/seo",
    source: "seo-monitoring-suite",
  },
  {
    id: "seo-duplicate-metadata",
    title: "Remove remaining routes that share identical metadata",
    area: "SEO",
    status: "partial",
    next: "A few dashboard routes still reuse the same title/description pair — give each a distinct one.",
    link: "/admin/monitoring/seo",
    source: "seo-monitoring-suite",
  },

  // ---------- SACCO ----------
  {
    id: "sacco-import",
    title: "SACCO CSV import with row-level validation preview",
    area: "SACCO",
    status: "done",
    link: "/admin/saccos",
    source: "sacco-integration-portal",
  },
  {
    id: "sacco-partner-api",
    title: "Partner sync API keys issued and rotated per SACCO",
    area: "SACCO",
    status: "done",
    link: "/admin/saccos",
    source: "sacco-integration-portal",
  },

  // ---------- Platform ----------
  {
    id: "pwa-offline",
    title: "Offline-first PWA with IndexedDB outbox and offline fallback",
    area: "Platform",
    status: "done",
    link: "/offline-test",
    source: "offline-first-pwa",
  },
  {
    id: "notification-preferences",
    title: "User-facing notification preference centre",
    area: "Platform",
    status: "done",
    link: "/settings",
    source: "track-b-voice-culture",
  },
];

export const WORK_AREAS = [
  "Capital",
  "Security",
  "Monitoring",
  "SEO",
  "SACCO",
  "Voice & Culture",
  "Platform",
] as const;

export function workSummary(items: WorkItem[] = REMAINING_WORK) {
  return {
    total: items.length,
    done: items.filter((i) => i.status === "done").length,
    partial: items.filter((i) => i.status === "partial").length,
    missing: items.filter((i) => i.status === "missing").length,
  };
}
