/**
 * SmartReach Capital — voice assistant.
 *
 * Answers an owner's spoken/typed question about their advance in one of four
 * registers: professional English, Kiswahili sanifu, Nairobi Sheng', Kenglish.
 *
 * The function is intentionally self-contained (no relative imports) so it can be
 * deployed on its own. It always answers from the owner's own advance data:
 *   · with an AI key configured it asks the model to phrase the answer;
 *   · without one (or if the model call fails) it composes the answer locally,
 *     so the feature works on a fresh project with no extra configuration.
 *
 * SECURITY: the caller's JWT is forwarded to Postgres, so the advance data is
 * still protected by RLS and by get_my_advance_status()'s owner check. Answers
 * never contain data belonging to another business.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Locale = "en" | "sw" | "sheng" | "kenglish";
type Tone = "formal" | "casual";
type Intent =
  | "greeting"
  | "confirm_details"
  | "retry"
  | "documents"
  | "sync_status"
  | "repayment_summary"
  | "status";

const REGISTER: Record<Locale, string> = {
  en: "Professional Kenyan English. Clear, direct, no slang.",
  sw: "Kiswahili sanifu (standard professional Swahili) as used in Kenyan business communication.",
  sheng:
    "Nairobi Sheng' — casual street register mixing Swahili and English (e.g. 'doh' for money, 'sasa' as greeting). Warm and informal, never disrespectful.",
  kenglish: "Kenglish — natural English/Kiswahili code-switching the way Nairobi SME owners speak.",
};

function sanitize(input: string): string {
  return input
    // Intentional: remove ASCII control characters before prompt processing.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f]+/g, " ")
    .replace(/(ignore|disregard)\s+(all\s+)?(previous|prior|above)\s+instructions?/gi, "[filtered]")
    .replace(/system\s*prompt/gi, "[filtered]")
    .slice(0, 500);
}

function detectIntent(q: string): Intent {
  const s = q.toLowerCase().trim();
  if (/(^\s*(hi|hey|hello|habari|sasa|niaje|mambo|hujambo|shalom)\b)/.test(s)) return "greeting";
  if (/(confirm|thibitisha|hakikisha|check my details|review (my )?details|sahihi)/.test(s)) return "confirm_details";
  if (/(last sync|synced|sync|webhook|last update|latest update|imesasishwa|usawazishaji|sasisho|update ya mwisho|ni lini)/.test(s))
    return "sync_status";
  if (/(repayment|repayments|repay|marejesho|kurejesha|malipo|installment|balance|deni|nilipe|nilipa|outstanding)/.test(s))
    return "repayment_summary";
  if (/(retry|try again|jaribu tena|rudia|refresh|angalia upya)/.test(s)) return "retry";
  if (/(document|documents|nyaraka|hati|papers|karatasi|requirement|inahitajika|mahitaji)/.test(s)) return "documents";
  return "status";
}

/** KES 12,500 */
function kes(value: unknown): string | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return `KES ${Math.round(n).toLocaleString("en-KE")}`;
}

/** "about two hours ago" / "saa mbili zilizopita" */
function relative(iso: unknown, locale: Locale): string | null {
  if (typeof iso !== "string") return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  const sw = locale === "sw" || locale === "kenglish";
  if (mins < 2) return sw ? "dakika chache zilizopita" : "just now";
  if (mins < 60) return sw ? `dakika ${mins} zilizopita` : `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return sw ? `saa ${hours} zilizopita` : `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return sw ? `siku ${days} zilizopita` : `${days} day${days === 1 ? "" : "s"} ago`;
}

type AdvanceStatus = {
  has_activity?: boolean;
  application?: {
    status?: string;
    requested_amount_kes?: number;
    revenue_share_pct?: number;
    review_note?: string | null;
  } | null;
  advance?: {
    principal_kes?: number;
    total_owed_kes?: number;
    amount_repaid_kes?: number;
    revenue_share_pct?: number;
    status?: string;
    disbursement_status?: string;
    mpesa_disbursement_ref?: string | null;
    disbursed_at?: string | null;
  } | null;
  repayments?: Array<{ amount_kes?: number; status?: string; collected_at?: string; created_at?: string }>;
  last_webhook_event?: { event_type?: string; status?: string; received_at?: string } | null;
  last_repayment_cron?: { status?: string; started_at?: string } | null;
};

const DOCUMENTS: Record<Locale, string> = {
  en: "You need four documents: the business registration certificate, M-Pesa or bank statements for the last three months, the owner's national ID, and a KRA PIN certificate.",
  sw: "Unahitaji nyaraka nne: cheti cha usajili wa biashara, taarifa za M-Pesa au benki za miezi mitatu iliyopita, kitambulisho cha mmiliki, na cheti cha KRA PIN.",
  sheng:
    "Unahitaji docs nne: biz registration cert, M-Pesa ama bank statement ya last three months, ID ya owner, na KRA PIN cert.",
  kenglish:
    "Unahitaji documents nne: business registration certificate, M-Pesa ama bank statements za last three months, national ID ya owner, na KRA PIN certificate.",
};

const GREETING: Record<Locale, string> = {
  en: "Hello. I can walk you through your advance, your repayments, or the documents we need. What would you like to know?",
  sw: "Habari. Naweza kukueleza kuhusu mkopo wako, marejesho, au nyaraka tunazohitaji. Ungependa kujua nini?",
  sheng: "Sasa! Naweza kukushow poa kuhusu doh yako, marejesho, ama docs zinahitajika. Unataka kujua aje?",
  kenglish: "Habari. Naweza kukueleza kuhusu advance yako, repayments, ama documents zinahitajika. Unataka kujua nini?",
};

const NO_ACTIVITY: Record<Locale, string> = {
  en: "You do not have an advance application yet. Start one from the Capital page and I will track it here.",
  sw: "Bado huna maombi ya mkopo. Anza maombi kwenye ukurasa wa Capital nami nitafuatilia hapa.",
  sheng: "Bado huna application ya doh. Anza kwa Capital page nami nitakufollow hapa.",
  kenglish: "Bado huna advance application. Anza kwa Capital page nami nitaitrack hapa.",
};

/**
 * Deterministic answer built only from the owner's own data. Used when no AI key
 * is configured (or the model is unavailable), so this feature never dead-ends.
 */
function composeAnswer(intent: Intent, locale: Locale, tone: Tone, status: AdvanceStatus): string {
  if (intent === "greeting") return GREETING[locale];
  if (intent === "documents") return DOCUMENTS[locale];
  if (!status || status.has_activity === false) return NO_ACTIVITY[locale];

  const advance = status.advance ?? null;
  const application = status.application ?? null;
  const sw = locale === "sw";
  const casual = tone === "casual" || locale === "sheng";

  if (intent === "retry") {
    if (sw) return "Nimeonyesha upya hali yako kwenye ukurasa. Malipo ya M-Pesa yanaweza kurudiwa na timu ya SmartReach pekee, si kwenye simu yako.";
    if (locale === "sheng") return "Nimerefresh status yako hapa. Payout ya M-Pesa ni timu ya SmartReach pekee inaeza iretry, si wewe kwa app.";
    if (locale === "kenglish") return "Nimerefresh status yako hapa. Retry ya M-Pesa payout ni SmartReach team pekee inaeza ifanya, si wewe.";
    return "I have refreshed your status on screen. Only the SmartReach team can retry an M-Pesa payout.";
  }

  if (intent === "confirm_details") {
    if (!application && !advance) return NO_ACTIVITY[locale];
    const requested = kes(application?.requested_amount_kes ?? advance?.principal_kes);
    const share = application?.revenue_share_pct ?? advance?.revenue_share_pct;
    const appStatus = application?.status ?? advance?.status ?? "in review";
    if (sw) {
      return `Maombi yako: ${requested ?? "kiasi bado haijawekwa"}, mgawo wa mapato ${share ?? "-"} asilimia, hali ${appStatus}. Ombi la kuthibitisha litakuja kwenye skrini.`;
    }
    return `Your application: ${requested ?? "amount not set"}, revenue share ${share ?? "-"} percent, status ${appStatus}. The app will ask you to confirm on screen.`;
  }

  if (intent === "sync_status") {
    const parts: string[] = [];
    const webhook = status.last_webhook_event;
    const cron = status.last_repayment_cron;
    const disbursement = advance?.disbursement_status ?? null;
    const whenWebhook = relative(webhook?.received_at, locale);
    const whenCron = relative(cron?.started_at, locale);

    if (webhook?.event_type) {
      parts.push(
        sw
          ? `Taarifa ya mwisho kutoka kwa mshirika: ${webhook.event_type}, hali ${webhook.status}${whenWebhook ? `, ${whenWebhook}` : ""}.`
          : `Last partner event: ${webhook.event_type}, status ${webhook.status}${whenWebhook ? `, ${whenWebhook}` : ""}.`,
      );
    } else {
      parts.push(sw ? "Bado hakuna taarifa kutoka kwa mshirika." : "No partner activity has arrived yet.");
    }

    if (cron?.status) {
      parts.push(
        sw
          ? `Ukusanyaji wa marejesho wa usiku: ${cron.status}${whenCron ? `, ${whenCron}` : ""}.`
          : `Nightly repayment collection: ${cron.status}${whenCron ? `, ${whenCron}` : ""}.`,
      );
    } else {
      parts.push(sw ? "Ukusanyaji wa marejesho bado haujafanyika." : "The nightly repayment collection has not run yet.");
    }

    if (disbursement) {
      const ref = advance?.mpesa_disbursement_ref;
      parts.push(
        sw
          ? `Malipo: ${disbursement}${ref ? `, kumbukumbu ${ref}` : ""}.`
          : `Disbursement: ${disbursement}${ref ? `, reference ${ref}` : ""}.`,
      );
    }
    return parts.join(" ");
  }

  if (intent === "repayment_summary") {
    const outstanding = (() => {
      const total = Number(advance?.total_owed_kes);
      const repaid = Number(advance?.amount_repaid_kes ?? 0);
      if (Number.isFinite(total)) return kes(Math.max(0, total - repaid));
      return null;
    })();
    const principal = kes(advance?.principal_kes);
    const repaid = kes(advance?.amount_repaid_kes ?? 0);
    const share = advance?.revenue_share_pct ?? application?.revenue_share_pct;
    const last = (status.repayments ?? [])[0];
    const whenLast = relative(last?.collected_at ?? last?.created_at, locale);
    const lastAmount = kes(last?.amount_kes);

    const bits: string[] = [];
    if (principal) bits.push(sw ? `Mkopo wako ni ${principal}` : `Your advance is ${principal}`);
    if (outstanding) bits.push(sw ? `deni linalobaki ni ${outstanding}` : `the outstanding balance is ${outstanding}`);
    if (share != null) bits.push(sw ? `mgawo wa mapato ni asilimia ${share}` : `the revenue share is ${share} percent`);
    if (lastAmount) {
      bits.push(
        sw
          ? `malipo ya mwisho yalikuwa ${lastAmount}, hali ${last.status ?? "-"}${whenLast ? `, ${whenLast}` : ""}`
          : `the most recent repayment was ${lastAmount}, status ${last.status ?? "-"}${whenLast ? `, ${whenLast}` : ""}`,
      );
    } else {
      bits.push(sw ? "hakuna marejesho bado" : "no repayments have been collected yet");
    }
    if (repaid) bits.push(sw ? `jumla iliyolipwa ni ${repaid}` : `${repaid} has been repaid so far`);

    if (bits.length === 0) return NO_ACTIVITY[locale];
    const body = bits.join(sw ? ", " : ", ");
    return casual && locale === "sheng" ? `${body}. Poa?` : `${body}.`;
  }

  // status
  if (!advance) {
    const appStatus = application?.status ?? "in review";
    return sw
      ? `Maombi yako yako ${appStatus}. Bado hakuna mkopo uliotolewa.`
      : `Your application is ${appStatus}. No advance has been disbursed yet.`;
  }
  const owed = kes(advance.total_owed_kes);
  const repaid = kes(advance.amount_repaid_kes ?? 0);
  return sw
    ? `Mkopo wako upo ${advance.status ?? "hai"}. Jumla ya deni ${owed ?? "-"}, umelipa ${repaid ?? "KES 0"}. Malipo: ${advance.disbursement_status ?? "bado"}.`
    : `Your advance is ${advance.status ?? "active"}. Total owed ${owed ?? "-"}, repaid ${repaid ?? "KES 0"}. Disbursement: ${advance.disbursement_status ?? "pending"}.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return json({ error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseUrl || !anonKey) return json({ error: "Supabase is not configured" }, 500);

    // Forward the caller's JWT so every query below runs under their RLS rights.
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    const businessId = typeof body?.businessId === "string" ? body.businessId : "";
    const question = typeof body?.question === "string" ? sanitize(body.question) : "";
    const locale: Locale = ["en", "sw", "sheng", "kenglish"].includes(body?.locale) ? body.locale : "en";
    const tone: Tone = body?.tone === "casual" ? "casual" : "formal";

    if (!businessId || !question) return json({ error: "businessId and question are required" }, 400);

    const { data: status, error: statusError } = await supabase.rpc("get_my_advance_status", {
      p_business_id: businessId,
    });
    if (statusError) {
      const denied = statusError.code === "42501" || /access denied/i.test(statusError.message);
      return json({ error: denied ? "forbidden" : statusError.message }, denied ? 403 : 400);
    }

    const intent = detectIntent(question);
    const fallback = composeAnswer(intent, locale, tone, (status ?? {}) as AdvanceStatus);
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    // No model key configured: answer from the owner's own data, immediately.
    if (!apiKey) return json({ answer: fallback, intent, source: "data" });

    const system = [
      "You are the SmartReach Capital voice assistant for a Kenyan MSME owner.",
      `Language and register: ${REGISTER[locale]}`,
      tone === "casual"
        ? "Tone: friendly and relaxed, like a trusted business friend. Short sentences."
        : "Tone: respectful and professional, like a good relationship manager.",
      "Answer ONLY from the JSON data provided. If a figure is missing, say you don't have it yet.",
      "Amounts are Kenyan Shillings — say them as KES. Keep the answer under 70 words, spoken-style, no markdown, no bullet points.",
      "You cannot change data. If asked to retry a disbursement or submit an application, explain the exact button to tap on the Capital page.",
      intent === "documents" ? "The owner asked which documents are required. List them briefly in one spoken sentence." : "",
    ].filter(Boolean).join("\n");

    try {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: `Advance data (JSON):\n${JSON.stringify(status)}\n\nQuestion: ${question}` },
          ],
        }),
      });

      if (!aiRes.ok) {
        // Model unavailable or out of credits: still answer the owner.
        console.error(`[capital-voice] gateway ${aiRes.status}`);
        return json({ answer: fallback, intent, source: "data" });
      }

      const payload = await aiRes.json();
      const answer = payload?.choices?.[0]?.message?.content?.trim();
      return json({ answer: answer || fallback, intent, source: answer ? "ai" : "data" });
    } catch (aiError) {
      console.error("[capital-voice] gateway error", aiError);
      return json({ answer: fallback, intent, source: "data" });
    }
  } catch (e) {
    console.error("[capital-voice] error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
