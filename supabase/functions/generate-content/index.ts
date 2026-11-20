/**
 * Generate Content Edge Function
 * 
 * Generates AI-powered marketing content for African SMEs
 * 
 * SECURITY:
 * - JWT authentication required
 * - Rate limited (20/min per IP, 50/min per user)
 * - Input validation with Zod
 * - Sanitized error responses
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { rateLimit, DEFAULT_LIMITS } from "../_shared/rate-limiter.ts";
import { 
  GenerateContentSchema, 
  validateInput, 
  parseJsonBody 
} from "../_shared/validators.ts";
import { logError, logSecurityEvent, internalError } from "../_shared/errors.ts";
import { getCorsHeaders, secureResponse } from "../_shared/security-headers.ts";
import { createChatCompletion } from "../_shared/ai-provider.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders('*', req.headers.get('Origin'));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify JWT authentication
    const auth = await verifyAuth(req, corsHeaders);
    if (auth.error) {
      logSecurityEvent('AUTH_FAILED', { endpoint: 'generate-content' });
      return auth.error;
    }

    // SECURITY: Apply rate limiting
    const rateLimitResult = rateLimit(
      req,
      auth.user!.id,
      { ...DEFAULT_LIMITS.ai, keyPrefix: 'generate-content' },
      corsHeaders
    );
    
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMITED', { 
        endpoint: 'generate-content', 
        userId: auth.user!.id 
      });
      return rateLimitResult.response!;
    }

    // SECURITY: Parse and validate input
    const { data: body, error: parseError } = await parseJsonBody(req, corsHeaders);
    if (parseError) return parseError;

    const validation = validateInput(GenerateContentSchema, body, corsHeaders);
    if (!validation.success) return validation.error!;

    const { prompt, contentType, language, tone, platform } = validation.data!;

    // Build the system prompt based on content type
    let systemPrompt = `You are a professional marketing content writer for African SMEs. `;
    
    switch (contentType) {
      case 'caption':
        systemPrompt += `Write engaging social media captions that resonate with African audiences. Be culturally aware and use appropriate local references when relevant.`;
        break;
      case 'description':
        systemPrompt += `Write compelling product or service descriptions that highlight value propositions for African markets.`;
        break;
      case 'email':
        systemPrompt += `Write professional marketing emails suitable for business communication in Africa. Include subject line and body.`;
        break;
      case 'sms':
        systemPrompt += `Write concise SMS marketing messages (max 160 characters). Be direct and include a clear call-to-action.`;
        break;
      case 'blog':
        systemPrompt += `Write informative blog posts that provide value to African business audiences.`;
        break;
      case 'ad_copy':
        systemPrompt += `Write persuasive advertising copy for digital campaigns targeting African consumers.`;
        break;
      case 'hashtags':
        systemPrompt += `Generate relevant hashtags for social media posts. Include a mix of popular and niche hashtags relevant to African markets.`;
        break;
      default:
        systemPrompt += `Write professional marketing content suitable for African businesses.`;
    }

    // SECURITY: tone/platform values are never interpolated into the prompt.
    // Caller-selected values map to fixed, server-owned instruction strings.
    const TONE_INSTRUCTIONS: Record<string, string> = {
      professional: 'Use a professional, confident tone.',
      casual: 'Use a relaxed, conversational tone.',
      friendly: 'Use a warm, friendly tone.',
      formal: 'Use a formal, respectful tone.',
      humorous: 'Use a light, humorous tone that stays respectful.',
      urgent: 'Use an urgent, action-driving tone.',
    };
    systemPrompt += ` ${TONE_INSTRUCTIONS[tone] ?? TONE_INSTRUCTIONS.professional}`;

    // Add language instructions
    if (language === 'sw') {
      systemPrompt += ` Write in Swahili.`;
    } else if (language === 'sheng') {
      systemPrompt += ` Write in Sheng (Kenyan urban slang).`;
    } else {
      systemPrompt += ` Write in English.`;
    }

    // Add platform-specific instructions (fixed strings only)
    const PLATFORM_INSTRUCTIONS: Record<string, string> = {
      whatsapp: 'Optimize for WhatsApp: short lines, easy to forward, works without images.',
      instagram: 'Optimize for Instagram: visual-first copy with emoji and tight hooks.',
      facebook: 'Optimize for Facebook: conversational copy that invites comments and shares.',
      tiktok: 'Optimize for TikTok: punchy, trend-aware copy for short video captions.',
      twitter: 'Optimize for Twitter/X: concise copy that fits the character limit.',
      email: 'Optimize for email: clear subject line and scannable body.',
    };
    if (platform) {
      systemPrompt += ` ${PLATFORM_INSTRUCTIONS[platform] ?? 'Optimize for the selected platform.'}`;
    }

    const response = await createChatCompletion({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    if (!response.ok) {
      const errorData = await response.text();
      logError('AI provider error', new Error(errorData), { status: response.status });
      throw new Error(`AI provider error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content;
    const tokensUsed = data.usage?.total_tokens || 0;

    return secureResponse(
      JSON.stringify({ 
        content: generatedContent,
        tokensUsed,
      }),
      200,
      { ...corsHeaders, ...rateLimitResult.headers }
    );

  } catch (error: unknown) {
    logError('generate-content function', error);
    return internalError(corsHeaders);
  }
});
