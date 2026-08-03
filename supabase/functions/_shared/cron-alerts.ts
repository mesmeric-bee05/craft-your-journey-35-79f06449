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
            url: `${url}/admin/health`,
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
          healthUrl: `${appBaseUrl()}/admin/health`,
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

export async function notifyCronFailure(svc: any, p: CronAlertPayload): Promise<void> {
  const [slack, email] = await Promise.all([postSlack(p), postEmail(p)]);
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
            url: `${url}/admin/health`,
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
  const [slack, email] = await Promise.all([
    postOpsSlack(p),
    postEmail({
      jobName: `${p.source}:${p.code}`,
      status: "failure",
      errorText: `${p.title}\n${p.detail}`,
      startedAt,
    }),
  ]);
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
      },
    });
  } catch (_) { /* ignore */ }
}

