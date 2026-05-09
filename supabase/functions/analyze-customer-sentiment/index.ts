// Voice of Customer: AI sentiment + theme + language analysis
// Writes to customer_sentiment_log + updates business_sentiment_daily rollup
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { rateLimit, DEFAULT_LIMITS } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  business_id: z.string().uuid(),
  text: z.string().min(1).max(8000),
  source: z.enum(["inbox", "csat", "public_form", "manual"]).default("inbox"),
  conversation_id: z.string().uuid().optional(),
  message_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
});

const TOOL = {
  type: "function",
  function: {
    name: "report_sentiment",
    description: "Return sentiment, themes, and language for a customer message.",
    parameters: {
      type: "object",
      properties: {
        sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
        score: { type: "number", description: "-1 (very negative) to 1 (very positive)" },
        themes: {
          type: "array",
          items: { type: "string" },
          description: "1-4 short noun-phrase themes (e.g. 'slow delivery', 'great packaging').",
        },
        language: { type: "string", enum: ["en", "sw", "sheng", "mixed"] },
      },
      required: ["sentiment", "score", "themes", "language"],
      additionalProperties: false,
    },
  },
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableKey) throw new Error("LOVABLE_API_KEY missing");
    if (!auth) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rl = rateLimit(req, user.id, { ...DEFAULT_LIMITS.ai, keyPrefix: "voc" }, corsHeaders);
    if (!rl.allowed && rl.response) return rl.response;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify membership
    const { data: member } = await userClient
      .from("business_members")
      .select("id")
      .eq("business_id", parsed.data.business_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    const { data: owned } = await userClient
      .from("businesses")
      .select("id")
      .eq("id", parsed.data.business_id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!member && !owned) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Call Lovable AI Gateway
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a Kenyan small-business voice-of-customer analyst. Detect sentiment, " +
              "extract 1-4 concrete themes, and identify language (en, sw=Swahili, sheng, or mixed). " +
              "Sheng is a Kenyan urban slang mixing Swahili and English. Be concise.",
          },
          { role: "user", content: parsed.data.text },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "report_sentiment" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("[VoC] AI gateway error", aiResp.status, t);
      const status = aiResp.status === 429 || aiResp.status === 402 ? aiResp.status : 502;
      return new Response(
        JSON.stringify({ error: "AI analysis failed", status }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiResp.json();
    const tc = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) throw new Error("No tool call returned");
    const args = JSON.parse(tc.function.arguments);

    // Persist via service role (sentiment tables only allow service writes)
    const admin = createClient(supabaseUrl, serviceKey);

    const { error: insertErr } = await admin.from("customer_sentiment_log").insert({
      business_id: parsed.data.business_id,
      conversation_id: parsed.data.conversation_id ?? null,
      message_id: parsed.data.message_id ?? null,
      customer_id: parsed.data.customer_id ?? null,
      source: parsed.data.source,
      sentiment: args.sentiment,
      score: Math.max(-1, Math.min(1, Number(args.score))),
      themes: Array.isArray(args.themes) ? args.themes.slice(0, 6) : [],
      language: args.language,
      raw_text: parsed.data.text.slice(0, 2000),
    });
    if (insertErr) throw insertErr;

    // Upsert daily rollup
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await admin
      .from("business_sentiment_daily")
      .select("*")
      .eq("business_id", parsed.data.business_id)
      .eq("date", today)
      .maybeSingle();

    const themeCounts: Record<string, number> = {};
    for (const t of (existing?.top_themes as Array<{ theme: string; count: number }> | null) ?? []) {
      themeCounts[t.theme] = t.count;
    }
    for (const t of args.themes ?? []) {
      themeCounts[t] = (themeCounts[t] ?? 0) + 1;
    }
    const topThemes = Object.entries(themeCounts)
      .map(([theme, count]) => ({ theme, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const prevTotal = existing?.total ?? 0;
    const prevAvg = Number(existing?.avg_score ?? 0);
    const newTotal = prevTotal + 1;
    const newAvg = (prevAvg * prevTotal + Number(args.score)) / newTotal;

    await admin.from("business_sentiment_daily").upsert({
      business_id: parsed.data.business_id,
      date: today,
      total: newTotal,
      positive: (existing?.positive ?? 0) + (args.sentiment === "positive" ? 1 : 0),
      neutral: (existing?.neutral ?? 0) + (args.sentiment === "neutral" ? 1 : 0),
      negative: (existing?.negative ?? 0) + (args.sentiment === "negative" ? 1 : 0),
      avg_score: Number(newAvg.toFixed(2)),
      top_themes: topThemes,
      updated_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        sentiment: args.sentiment,
        score: args.score,
        themes: args.themes,
        language: args.language,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[VoC] error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
