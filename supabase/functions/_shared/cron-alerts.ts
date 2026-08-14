/**
 * Shared cron failure alerting:
 *  - Posts a Slack message via the Lovable connector gateway (when SLACK_API_KEY +
 *    SLACK_ALERTS_CHANNEL_ID + LOVABLE_API_KEY are configured).
 *  - Writes an audit row to public.audit_logs via service-role client.
 *  - Email alerting is skipped gracefully if app-emails infra is not yet provisioned.
 *
 * Designed to never throw — alert failures must not mask the underlying job error.
 */
const SLACK_GATEWAY = "https://connector-gateway.lovable.dev/slack/api";

export interface CronAlertPayload {
  jobName: string;
  status: "failure" | "warning";
  errorText: string;
  startedAt: string;
  durationMs?: number;
  appUrl?: string;
}

function appBaseUrl(): string {
  return (
    Deno.env.get("APP_PUBLIC_URL") ||
    Deno.env.get("PUBLIC_APP_URL") ||
    "https://craft-your-journey-35.lovable.app"
  );
}

async function postSlack(p: CronAlertPayload): Promise<{ ok: boolean; reason?: string }> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const slackKey = Deno.env.get("SLACK_API_KEY");
  const channel = Deno.env.get("SLACK_ALERTS_CHANNEL_ID");
  if (!lovableKey || !slackKey || !channel) {
    return { ok: false, reason: "slack_not_configured" };
  }
  const url = appBaseUrl();
  const body = {
    channel,
    text: `:rotating_light: Scheduled job failed: ${p.jobName}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `🚨 ${p.jobName} failed` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Started:*\n${p.startedAt}` },
          { type: "mrkdwn", text: `*Duration:*\n${p.durationMs ?? "?"} ms` },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "```" + p.errorText.slice(0, 800).replace(/```/g, "''") + "```",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open System Health" },
            url: `${url}/admin/monitoring/health`,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Security Findings" },
            url: `${url}/security/findings`,
          },
        ],
      },
    ],
  };
  try {
    const res = await fetch(`${SLACK_GATEWAY}/chat.postMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": slackKey,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      return { ok: false, reason: json?.error ?? `http_${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String((e as Error).message ?? e) };
  }
}

async function postEmail(p: CronAlertPayload): Promise<{ ok: boolean; reason?: string }> {
  // App-emails infra is optional. If `send-transactional-email` exists and a
  // template is registered, this will deliver. Otherwise we degrade silently.
  const base = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!base || !anon) return { ok: false, reason: "no_supabase_env" };
  try {
    const res = await fetch(`${base}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      body: JSON.stringify({
        templateName: "cron-failure-alert",
        recipientRole: "admin",
        idempotencyKey: `${p.jobName}-${p.startedAt}`,
        templateData: {
          jobName: p.jobName,
          errorText: p.errorText.slice(0, 1500),
          startedAt: p.startedAt,
          durationMs: p.durationMs ?? null,
          healthUrl: `${appBaseUrl()}/admin/monitoring/health`,
          findingsUrl: `${appBaseUrl()}/security/findings`,
        },
      }),
    });
    if (res.status === 404) return { ok: false, reason: "email_infra_not_configured" };
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String((e as Error).message ?? e) };
  }
}

/* ------------------------------------------------------------------ *
 * User notification preferences (Settings → Alerts & Language)
 * ------------------------------------------------------------------ */

type Frequency = "immediate" | "hourly" | "daily" | "off";

interface AlertPolicy {
  slack: boolean;
  email: boolean;
  inAppUserIds: string[];
  /** Minimum minutes between alerts for the same key; 0 = immediate. */
  windowMinutes: number;
  /** True when every admin turned alerts off. */
  muted: boolean;
}

const WINDOW: Record<Frequency, number> = { immediate: 0, hourly: 60, daily: 1440, off: -1 };

/** Union of admin preferences. Falls back to Slack+email immediate when nothing is stored. */
// deno-lint-ignore no-explicit-any
async function resolveAlertPolicy(svc: any): Promise<AlertPolicy> {
  const fallback: AlertPolicy = { slack: true, email: true, inAppUserIds: [], windowMinutes: 0, muted: false };
  try {
    const { data: roles } = await svc.from("user_roles").select("user_id").eq("role", "admin");
    const ids: string[] = (roles ?? []).map((r: { user_id: string }) => r.user_id);
    if (ids.length === 0) return fallback;
    const { data: settings } = await svc.from("user_settings").select("user_id, preferences").in("user_id", ids);
    const rows: Array<{ user_id: string; preferences: Record<string, unknown> | null }> = settings ?? [];
    if (rows.length === 0) return { ...fallback, inAppUserIds: ids };

    let slack = false, email = false;
    const inApp: string[] = [];
    let window = Number.POSITIVE_INFINITY;
    let any = false;
    for (const id of ids) {
      const p = (rows.find((r) => r.user_id === id)?.preferences?.ops_alerts ?? {}) as {
        email?: boolean; slack?: boolean; in_app?: boolean; frequency?: Frequency;
      };
      const freq: Frequency = p.frequency ?? "immediate";
      if (freq === "off") continue;
      any = true;
      window = Math.min(window, WINDOW[freq] ?? 0);
      if (p.slack) slack = true;
      if (p.email !== false) email = true;
      if (p.in_app !== false) inApp.push(id);
    }
    if (!any) return { slack: false, email: false, inAppUserIds: [], windowMinutes: 0, muted: true };
    return { slack, email, inAppUserIds: inApp, windowMinutes: Number.isFinite(window) ? window : 0, muted: false };
  } catch (_) {
    return fallback;
  }
}

/** True when an identical alert was already logged inside the digest window. */
// deno-lint-ignore no-explicit-any
async function throttled(svc: any, action: string, key: string, windowMinutes: number): Promise<boolean> {
  if (windowMinutes <= 0) return false;
  try {
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const { data } = await svc
      .from("audit_logs")
      .select("id, metadata, created_at")
      .eq("action", action)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data ?? []).some(
      (r: { metadata: Record<string, unknown> | null }) =>
        String(r.metadata?.job_name ?? r.metadata?.code ?? "") === key,
    );
  } catch (_) {
    return false;
  }
}

// deno-lint-ignore no-explicit-any
async function notifyInApp(svc: any, userIds: string[], title: string, message: string, link: string) {
  if (userIds.length === 0) return;
  try {
    await svc.from("notifications").insert(
      userIds.map((user_id) => ({
        user_id,
        type: "status_change" as const,
        title: title.slice(0, 120),
        message: message.slice(0, 400),
        metadata: { link },
      })),
    );
  } catch (_) { /* ignore */ }
}

export async function notifyCronFailure(svc: any, p: CronAlertPayload): Promise<void> {
  // "skipped" runs are a setup gap (e.g. an unverified Search Console site),
  // not a job failure — never page anyone for them.
  if ((p.status as string) === "skipped") return;
  const policy = await resolveAlertPolicy(svc);
  if (policy.muted) return;
  if (await throttled(svc, "cron.failure_alert", p.jobName, policy.windowMinutes)) return;


  const [slack, email] = await Promise.all([
    policy.slack ? postSlack(p) : Promise.resolve({ ok: false, reason: "disabled_by_preference" }),
    policy.email ? postEmail(p) : Promise.resolve({ ok: false, reason: "disabled_by_preference" }),
  ]);
  await notifyInApp(
    svc,
    policy.inAppUserIds,
    `Scheduled job failed: ${p.jobName}`,
    p.errorText,
    `${appBaseUrl()}/admin/monitoring/health`,
  );
  try {
    await svc.from("audit_logs").insert({
      action: "cron.failure_alert",
      entity_type: "cron_job",
      metadata: {
        job_name: p.jobName,
        status: p.status,
        started_at: p.startedAt,
        duration_ms: p.durationMs ?? null,
        error_text: p.errorText.slice(0, 1500),
        slack: slack.ok ? "sent" : `skip:${slack.reason}`,
        email: email.ok ? "sent" : `skip:${email.reason}`,
        in_app: policy.inAppUserIds.length,
      },
    });
  } catch (_) { /* ignore */ }
}


/* ------------------------------------------------------------------ *
 * Generic Capital / ops failure alerting
 * ------------------------------------------------------------------ */

export interface OpsAlertPayload {
  /** e.g. "capital-partner-webhook", "mpesa-b2c-disburse" */
  source: string;
  /** short machine-ish label, e.g. "signature_invalid" */
  code: string;
  title: string;
  detail: string;
  context?: Record<string, unknown>;
}

async function postOpsSlack(p: OpsAlertPayload): Promise<{ ok: boolean; reason?: string }> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const slackKey = Deno.env.get("SLACK_API_KEY");
  const channel = Deno.env.get("SLACK_ALERTS_CHANNEL_ID");
  if (!lovableKey || !slackKey || !channel) return { ok: false, reason: "slack_not_configured" };
  const url = appBaseUrl();
  const ctx = p.context
    ? Object.entries(p.context).map(([k, v]) => `*${k}:*\n${String(v)}`)
    : [];
  const body = {
    channel,
    text: `:rotating_light: ${p.title}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: `🚨 ${p.title}`.slice(0, 150) } },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Source:*\n${p.source}` },
          { type: "mrkdwn", text: `*Code:*\n${p.code}` },
          ...ctx.slice(0, 6).map((text) => ({ type: "mrkdwn", text })),
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "```" + p.detail.slice(0, 800).replace(/```/g, "''") + "```",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Capital Operations" },
            url: `${url}/admin/capital/ops`,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "System Health" },
            url: `${url}/admin/monitoring/health`,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Security Findings" },
            url: `${url}/security/findings`,
          },
        ],
      },
    ],
  };
  try {
    const res = await fetch(`${SLACK_GATEWAY}/chat.postMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": slackKey,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) return { ok: false, reason: json?.error ?? `http_${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String((e as Error).message ?? e) };
  }
}

/**
 * Fire-and-forget ops alert: Slack + email (degrades silently) + audit row.
 * Never throws — alerting must not mask the underlying failure.
 */
// deno-lint-ignore no-explicit-any
export async function notifyOpsFailure(svc: any, p: OpsAlertPayload): Promise<void> {
  const startedAt = new Date().toISOString();
  const policy = await resolveAlertPolicy(svc);
  if (policy.muted) return;
  if (await throttled(svc, "ops.failure_alert", p.code, policy.windowMinutes)) return;
  const [slack, email] = await Promise.all([
    policy.slack ? postOpsSlack(p) : Promise.resolve({ ok: false, reason: "disabled_by_preference" }),
    policy.email ? postEmail({
      jobName: `${p.source}:${p.code}`,
      status: "failure",
      errorText: `${p.title}\n${p.detail}`,
      startedAt,
    }) : Promise.resolve({ ok: false, reason: "disabled_by_preference" }),
  ]);
  await notifyInApp(svc, policy.inAppUserIds, p.title, p.detail, `${appBaseUrl()}/admin/capital/ops`);
  try {
    await svc.from("audit_logs").insert({
      action: "ops.failure_alert",
      entity_type: p.source,
      metadata: {
        code: p.code,
        title: p.title,
        detail: p.detail.slice(0, 1500),
        context: p.context ?? {},
        at: startedAt,
        slack: slack.ok ? "sent" : `skip:${slack.reason}`,
        email: email.ok ? "sent" : `skip:${email.reason}`,
        in_app: policy.inAppUserIds.length,
      },
    });
  } catch (_) { /* ignore */ }
}

