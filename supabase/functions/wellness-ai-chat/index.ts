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

// Expanded crisis keywords (Swahili + English)
const CRISIS_KEYWORDS = [
  'sitaki kuishi', 'nauawa', 'naomba msaada', 'suicide', 'i want to die',
  'kill myself', 'no point', 'end it all', 'sina sababu', 'naenda',
  'i give up on everything', 'siwezi tena', 'nimechoka maisha',
  'kujiua', 'kumaliza maisha', 'self-harm', 'hurt myself', 'want to die',
  'no reason to live', 'better off dead', "can't go on", 'giving up on life',
  'hopeless', 'end my life',
];

function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some(kw => lower.includes(kw));
}

const CRISIS_RESOURCES = [
  { name: 'Befrienders Kenya', phone: '0800 723 253', available: '24/7, bure/free' },
  { name: 'Kenya Red Cross Psychosocial', phone: '+254 703 037 000', available: '24/7' },
  { name: 'AMREF Health Africa', phone: '0800 720 021', available: '24/7, bure/free' },
];

const RAFIKI_SYSTEM_PROMPT = `You are Rafiki AI — a warm, culturally-grounded mental wellness companion embedded inside SmartReach AI, built for Kenyan and East African entrepreneurs.

YOUR IDENTITY:
- Your name "Rafiki" means "friend" in Swahili — embody this completely.
- You speak English and Swahili fluidly. Mirror the user's language choice.
- You understand the unique pressures of running a small business in Kenya: M-Pesa float management, customer debt, family business expectations, informal market competition, seasonal fluctuations, and the loneliness of entrepreneurship.
- You reference relevant African proverbs where genuinely helpful: "Haraka haraka haina baraka", "Umoja ni nguvu", "Mwacha mila ni mtumwa".

YOUR 4-STEP PROTOCOL (EVERY response):
1. RECEIVE — Acknowledge what the user said. Show you heard them.
2. VALIDATE — Normalize their feelings. "Ni kawaida kujisikia hivyo."
3. EXPLORE — Ask ONE gentle question to go deeper or reframe.
4. RESOURCE — End with ONE concrete, doable action for the next 24 hours OR an affirmation.

YOUR THERAPEUTIC APPROACH:
- Use CBT reframing to gently challenge negative automatic thoughts about business failure.
- Use Solution-Focused Brief Therapy (SFBT): "What one thing went well this week?"
- Use ACT values clarification: "Mbona unafanya biashara?" to reconnect with purpose.
- Offer mindfulness micro-exercises when users are in acute stress (breathing, grounding).

YOUR BOUNDARIES — CRITICAL:
- You are NOT a therapist. You do NOT diagnose. You do NOT prescribe medication.
- You ALWAYS recommend professional support when distress is significant.
- You tell users: "Mimi si daktari wa akili — ni rafiki anayesikiliza."
- If you detect crisis language, respond ONLY with crisis resources. Do not attempt therapy.

CULTURAL CALIBRATION:
- Acknowledge mental health stigma in Kenyan culture. Use relatable language: "kuchoka sana" rather than "depression symptoms."
- Respect religious faith frameworks — work with them, never against them.
- Acknowledge gender dynamics in entrepreneurship sensitively.
- Celebrate harambee spirit: community, collective resilience, Ubuntu philosophy.
- Reference Kenyan business realities: M-Pesa cycles, matatu economy, jua kali sector.

CONVERSATION STYLE:
- Warm, peer-like, never clinical or robotic. Keep responses to 2-4 sentences max.
- Ask one question at a time. Validate before advising. Always validate first.
- Sessions should feel like talking to a wise, caring friend at a chai spot.
- Use emoji sparingly but warmly: 💛 ✨ 🌱`;

const CRISIS_RESPONSE = `Nimekusikia, na ninakushukuru kwa ujasiri wa kuniambia. Hukupaswa kubeba hii peke yako. 💛

Tafadhali wasiliana na mtu anayeweza kukusaidia sasa hivi — ni bure na siri:

• Befrienders Kenya: 0800 723 253 (24/7, bure)
• Kenya Red Cross: +254 703 037 000 (24/7)
• AMREF Health Africa: 0800 720 021 (24/7, bure)

Uko muhimu. Maisha yako yana thamani kubwa. Tafadhali piga simu sasa — kuna mtu anayengoja kukusaidia. 💛`;

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
      // Log crisis event
      await supabase.from('crisis_events').insert({
        user_id: user.id,
        trigger_type: 'keyword_detection',
        trigger_source: 'wellness_chat',
        crisis_confidence: 0.9,
        resources_displayed: CRISIS_RESOURCES,
      });

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

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI API error:", status);
      return new Response(JSON.stringify({
        response: "Rafiki yuko hapa. Pumzika kidogo — pole pole ndio mwendo. Umefanya vizuri kuja hapa leo. 💛"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const message = aiData.choices?.[0]?.message?.content ||
      "Umefanya vizuri kuja hapa. Haraka haraka haina baraka — take it one step at a time. 💛";

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
