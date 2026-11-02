import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { verifyAuth, verifyBusinessMembership } from "../_shared/auth.ts";

const REGISTER: Record<string, string> = {
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

export type VoiceIntent =
  | "confirm_details"
  | "retry"
  | "documents"
  | "sync_status"
  | "repayment_summary"
  | "status";

/**
 * Keyword intent detection across English, Kiswahili, Sheng' and Kenglish.
 * Intents never mutate data on their own — the client always asks the owner to
 * confirm on screen before any action runs.
 */
function detectIntent(q: string): VoiceIntent {
  const s = q.toLowerCase();
  if (/(confirm|thibitisha|hakikisha|check my details|review (my )?details|sahihi)/.test(s)) return "confirm_details";
  if (/(last sync|synced|sync|webhook|last update|latest update|imesasishwa|usawazishaji|sasisho|update ya mwisho|ni lini)/.test(s))
    return "sync_status";
  if (
    /(repayment|repayments|repay|marejesho|kurejesha|malipo|installment|balance|deni|nilipe|nilipa|outstanding)/.test(s)
  )
    return "repayment_summary";
  if (/(retry|try again|jaribu tena|rudia|refresh|angalia upya)/.test(s)) return "retry";
  if (/(document|documents|nyaraka|hati|papers|karatasi|requirement|inahitajika)/.test(s)) return "documents";
  return "status";
}




Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { user, supabase, error } = await verifyAuth(req, corsHeaders);
    if (error || !user || !supabase) return error ?? json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    const businessId = typeof body?.businessId === "string" ? body.businessId : "";
    const question = typeof body?.question === "string" ? sanitize(body.question) : "";
    const locale = typeof body?.locale === "string" && body.locale in REGISTER ? body.locale : "en";
    const tone = body?.tone === "casual" ? "casual" : "formal";

    if (!businessId || !question) return json({ error: "businessId and question are required" }, 400);
    const isMember = await verifyBusinessMembership(supabase, user.id, businessId);
    if (!isMember) return json({ error: "forbidden" }, 403);

    const { data: status, error: statusError } = await supabase.rpc("get_my_advance_status", {
      p_business_id: businessId,
    });
    if (statusError) return json({ error: statusError.message }, 400);

    const intent = detectIntent(question);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured" }, 500);

    const system = [
      "You are the SmartReach Capital voice assistant for a Kenyan MSME owner.",
      `Language and register: ${REGISTER[locale]}`,
      tone === "casual"
        ? "Tone: friendly and relaxed, like a trusted business friend. Short sentences."
        : "Tone: respectful and professional, like a good relationship manager.",
      "Answer ONLY from the JSON data provided. If a figure is missing, say you don't have it yet.",
      "Amounts are Kenyan Shillings — say them as KES. Keep the answer under 70 words, spoken-style, no markdown, no bullet points.",
      "You cannot change data. If asked to retry a disbursement or submit an application, explain the exact button to tap on the Capital page.",
      intent === "confirm_details"
        ? "The owner asked to confirm their application details. Read back the requested amount, revenue share and application status, then say the app will ask them to confirm on screen."
        : "",
      intent === "documents"
        ? "The owner asked which documents are required. List them briefly in one spoken sentence: business registration, M-Pesa or bank statements for the last 3 months, national ID of the owner, and a KRA PIN certificate."
        : "",
      intent === "retry"
        ? "The owner asked to retry something. Explain that the app will refresh their status now, and that only the SmartReach team can retry an M-Pesa payout."
        : "",
      intent === "repayment_summary"
        ? [
            "The owner asked for a repayment summary. Give ONE spoken answer covering, only if present in the data:",
            "the advance amount and outstanding balance in KES, the revenue share percentage,",
            "the most recent repayment with its amount, status and how recently it happened (relative time such as 'yesterday evening'),",
            "the total repaid so far, and whether the nightly collection last ran successfully or failed.",
            "If a figure is missing, say plainly you don't have it yet. Never invent amounts or times.",
          ].join(" ")
        : "",
      intent === "sync_status"
        ? [
            "The owner asked when their advance last synced. Give ONE spoken answer covering, in this order and only if present in the data:",
            "1) last_webhook_event — what partner event arrived, its status, and how recently (say it in relative time like 'about two hours ago');",
            "2) last_repayment_cron — whether the nightly repayment collection ran and succeeded, and when;",
            "3) last_disbursement_event — the disbursement status and M-Pesa reference if any, plus the outstanding balance from the advance.",
            "If a piece is missing, say plainly that there is no partner activity yet for that part. Do not invent times.",
          ].join(" ")
        : "",
    ].filter(Boolean).join("\n");



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
      const detail = await aiRes.text().catch(() => "");
      console.error(`[capital-voice] gateway ${aiRes.status}: ${detail}`);
      if (aiRes.status === 429) return json({ error: "Too many requests — try again shortly." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: "AI request failed", status: aiRes.status }, 502);
    }

    const payload = await aiRes.json();
    const answer = payload?.choices?.[0]?.message?.content?.trim();
    if (!answer) return json({ error: "No answer generated" }, 502);
    return json({ answer, intent });
  } catch (e) {
    console.error("[capital-voice] error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
