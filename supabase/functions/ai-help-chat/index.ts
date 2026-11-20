/**
 * AI Help Chat Edge Function
 * 
 * Provides contextual AI assistance for SmartReach platform users.
 * Uses the shared AI adapter (Gemini, Lovable gateway, or OpenAI-compatible).
 * 
 * SECURITY:
 * - JWT authentication required
 * - Rate limited (20/min per user)
 * - Input validation with Zod
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { rateLimit } from "../_shared/rate-limiter.ts";
import { validateInput, parseJsonBody } from "../_shared/validators.ts";
import { logError, logSecurityEvent, internalError } from "../_shared/errors.ts";
import { getCorsHeaders, secureResponse } from "../_shared/security-headers.ts";
import { createChatCompletion } from "../_shared/ai-provider.ts";
import { z } from "https://esm.sh/zod@3.22.4";


const HelpChatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20).optional().default([]),
});

const SYSTEM_PROMPT = `You are the SmartReach AI Help Assistant — an expert on the SmartReach platform built for African SMEs.

You have deep knowledge of every platform module:
• **Social Inbox** — Unified messaging across WhatsApp, SMS, Email, Instagram, Facebook DMs. SLA tracking, CSAT surveys, AI-suggested replies, quick replies, conversation assignment, priority levels.
• **AI Marketing Engine** — Generate captions, emails, ad copy, hashtags in English, Swahili, or Sheng. Tone and platform customization.
• **Social Media Manager** — Schedule posts, cross-platform previews, content calendar, post templates, hashtag analytics, best posting times.
• **Live Studio** — Multi-platform streaming (YouTube, Facebook, TikTok, Twitch), live chat moderation, polls, stream overlays, RTMP destinations.
• **Talent Hub** — Post jobs, browse freelancers, manage applications, create contracts, track payments.
• **Customer CRM** — Customer profiles, tags, segments, contact history, channel tracking.
• **Automations** — Workflow builder with triggers (new message, customer tag, time-based), actions (send reply, assign agent, tag customer, notify team).
• **Inventory Management** — Products, suppliers, stock movements, low-stock alerts, reorder levels, categories (electronics, food, clothing, etc.).
• **Payments & M-Pesa** — Digital wallet, M-Pesa STK Push, deposits, transfers, payouts, transaction history in KES.
• **Analytics & Reports** — Conversation trends, revenue charts, SLA performance, CSAT analytics, team performance, channel analytics. CSV export for all reports.
• **Settings** — Profile, business details, team management, notification preferences, channel configuration, SLA policies, CSAT surveys, canned responses, security (password, 2FA).

Guidelines:
- Be concise, friendly, and professional
- Use bullet points for multi-step instructions
- Reference specific UI locations (e.g., "Go to Settings → SLA tab")
- If you don't know something, suggest contacting support via the Help Center
- Understand African business context (M-Pesa, KES currency, Swahili)
- Never reveal internal implementation details or database schema`;

serve(async (req) => {
  const corsHeaders = getCorsHeaders('*', req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await verifyAuth(req, corsHeaders);
    if (auth.error) {
      logSecurityEvent('AUTH_FAILED', { endpoint: 'ai-help-chat' });
      return auth.error;
    }

    const rateLimitResult = rateLimit(
      req,
      auth.user!.id,
      {
        ipLimit: { windowMs: 60000, maxRequests: 20 },
        userLimit: { windowMs: 60000, maxRequests: 20 },
        keyPrefix: 'ai-help-chat'
      },
      corsHeaders
    );

    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMITED', { endpoint: 'ai-help-chat', userId: auth.user!.id });
      return rateLimitResult.response!;
    }

    const { data: body, error: parseError } = await parseJsonBody(req, corsHeaders);
    if (parseError) return parseError;

    const validation = validateInput(HelpChatSchema, body, corsHeaders);
    if (!validation.success) return validation.error!;

    const { message, history } = validation.data!;

    // SECURITY: Never trust caller-supplied roles — incoming history entries are
    // flattened to 'user' so a client cannot forge assistant/system turns.
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10).map(h => ({ role: 'user' as const, content: h.content })),
      { role: 'user', content: message },
    ];

    const response = await createChatCompletion({
      model: 'google/gemini-2.5-flash-lite',
      messages,
      max_tokens: 800,
      temperature: 0.5,
    });

    if (!response.ok) {
      const errorData = await response.text();
      logError('AI provider error', new Error(errorData), { status: response.status });
      throw new Error(`AI provider error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'I apologize, I could not generate a response. Please try again.';

    return secureResponse(
      JSON.stringify({ reply }),
      200,
      { ...corsHeaders, ...rateLimitResult.headers }
    );

  } catch (error: unknown) {
    logError('ai-help-chat function', error);
    return internalError(corsHeaders);
  }
});
