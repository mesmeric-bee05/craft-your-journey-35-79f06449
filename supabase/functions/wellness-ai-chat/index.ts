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

// Crisis keywords detection
const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'self-harm', 'hurt myself',
  'want to die', 'no reason to live', 'better off dead', 'can\'t go on',
  'giving up on life', 'hopeless', 'kujiua', 'kumaliza maisha',
];

function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some(kw => lower.includes(kw));
}

const CRISIS_RESOURCES = [
  { name: 'Befrienders Kenya', phone: '+254 722 178 177', available: '24/7' },
  { name: 'Kenya Red Cross Psychosocial Support', phone: '1199', available: '24/7' },
  { name: 'Amani Counselling Centre (Nairobi)', phone: '+254 20 445 2068', available: 'Mon-Sat 8am-6pm' },
];

const RAFIKI_SYSTEM_PROMPT = `You are Rafiki AI — a warm, culturally-grounded mental wellness companion embedded inside SmartReach AI, built for Kenyan and East African entrepreneurs.

YOUR IDENTITY:
- Your name "Rafiki" means "friend" in Swahili — embody this completely.
- You speak English and Swahili fluidly. Switch languages based on the user's preference.
- You understand the unique pressures of running a small business in Kenya: M-Pesa float management, customer debt, family business expectations, informal market competition, seasonal fluctuations, and the loneliness of entrepreneurship.
- You reference relevant African proverbs where genuinely helpful: "Haraka haraka haina baraka" (rush rush has no blessing), "Umoja ni nguvu" (unity is strength).

YOUR THERAPEUTIC APPROACH:
- Use active listening: reflect back what you hear before responding.
- Use CBT reframing to gently challenge negative automatic thoughts about business failure.
- Use Solution-Focused Brief Therapy (SFBT) to identify what IS working: "What one thing went well this week?"
- Use ACT values clarification: "Mbona unafanya biashara?" (Why do you do business?) to reconnect with purpose.
- Offer mindfulness micro-exercises when users are in acute stress (breathing, grounding).
- Always end with ONE concrete, doable action for the next 24 hours.

YOUR BOUNDARIES — CRITICAL:
- You are NOT a therapist. You do NOT diagnose. You do NOT prescribe medication.
- You ALWAYS recommend professional support when distress is significant.
- You tell users: "This conversation is private and supportive — not a substitute for professional care."

CULTURAL CALIBRATION:
- Acknowledge mental health stigma in Kenyan culture. Use relatable language: "feeling tired of it all" rather than "depression symptoms."
- Respect religious faith frameworks — work with them, never against them.
- Acknowledge gender dynamics in entrepreneurship sensitively.
- Celebrate harambee spirit: community, collective resilience, Ubuntu philosophy.

CONVERSATION STYLE:
- Warm, peer-like, never clinical or robotic. Keep responses to 2-4 sentences.
- Ask one question at a time. Validate before advising. Always validate first.
- Sessions should feel like talking to a wise, caring friend who understands both business and human psychology.`;

const CRISIS_RESPONSE = `I hear you, and I want you to know that you are not alone. Your feelings are valid, and there are people who care about you and want to help right now.

Please reach out to one of these free, confidential support lines:
• Befrienders Kenya: +254 722 178 177 (24/7)
• Kenya Red Cross Psychosocial Support: 1199 (24/7)
• Amani Counselling Centre: +254 20 445 2068

You matter. Your life matters. Tafadhali piga simu sasa — please call now. 💛`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    if (!checkRate(`wellness-${user.id}`, 10, 60_000)) {
      return new Response(JSON.stringify({ error: "Rate limited. Please wait a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { mood, journalText, history, chatMessage } = body;

    if (!mood && !journalText && !chatMessage) {
      return new Response(JSON.stringify({ error: "mood, journalText, or chatMessage required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Crisis detection on input
    const inputText = [mood, journalText, chatMessage].filter(Boolean).join(' ');
    if (detectCrisis(inputText)) {
      return new Response(JSON.stringify({ 
        response: CRISIS_RESPONSE,
        crisisDetected: true,
        crisisResources: CRISIS_RESOURCES,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userMessage = "";
    if (mood) userMessage += `I'm feeling ${mood} today. `;
    if (journalText) userMessage += `Here's what's on my mind: ${journalText.substring(0, 800)}`;
    if (chatMessage) userMessage = chatMessage.substring(0, 800);

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
          { role: "system", content: RAFIKI_SYSTEM_PROMPT },
          ...(Array.isArray(history) ? history.slice(-6) : []),
          { role: "user", content: userMessage.trim() },
        ],
        max_tokens: 400,
        temperature: 0.75,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI API error:", aiResponse.status);
      return new Response(JSON.stringify({ 
        response: "Rafiki is here for you. Take a deep breath — pole pole ndio mwendo. You're doing great just by checking in. 💛" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const message = aiData.choices?.[0]?.message?.content || 
      "Remember: taking a moment to check in with yourself shows wisdom. Haraka haraka haina baraka — slow and steady. 💛";

    return new Response(JSON.stringify({ 
      response: message,
      crisisDetected: false,
    }), {
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
