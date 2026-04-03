import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();

function checkRate(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(key);
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 10/min per user
    if (!checkRate(`wellness-${user.id}`, 10, 60_000)) {
      return new Response(JSON.stringify({ error: "Rate limited. Please wait." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse & validate
    const body = await req.json();
    const { mood, journalText, history } = body;

    if (!mood && !journalText) {
      return new Response(JSON.stringify({ error: "mood or journalText required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a compassionate wellness companion for business owners and entrepreneurs. 
Your role is to provide empathetic, evidence-based mental health support. 
- Acknowledge feelings without judgment
- Offer practical, actionable wellness tips
- Suggest breathing exercises, breaks, or mindfulness when appropriate  
- Keep responses concise (2-4 sentences)
- Never diagnose or replace professional help — gently suggest seeking professional support if someone seems in crisis
- Be warm, encouraging, and human`;

    let userMessage = "";
    if (mood) userMessage += `I'm feeling ${mood} today. `;
    if (journalText) userMessage += `Here's what's on my mind: ${journalText.substring(0, 500)}`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          ...(Array.isArray(history) ? history.slice(-4) : []),
          { role: "user", content: userMessage.trim() },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI API error:", aiResponse.status);
      return new Response(JSON.stringify({ 
        response: "I'm here for you. Take a deep breath — you're doing great just by checking in with yourself." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const message = aiData.choices?.[0]?.message?.content || 
      "Remember: taking a moment to check in with yourself is already a step towards better wellness.";

    return new Response(JSON.stringify({ response: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Wellness AI error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
