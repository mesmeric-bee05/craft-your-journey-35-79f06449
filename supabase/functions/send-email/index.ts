/**
 * Send Email Edge Function
 * 
 * Sends emails through the connected email service
 * 
 * SECURITY:
 * - JWT authentication required
 * - Business membership verification
 * - Rate limited (10/min per IP, 50/min per user)
 * - Input validation with Zod
 * 
 * Note: This is a placeholder that logs email attempts.
 * In production, integrate with Resend, SendGrid, or similar service.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, verifyBusinessMembership } from "../_shared/auth.ts";
import { rateLimit } from "../_shared/rate-limiter.ts";
import { SendEmailSchema, validateInput, parseJsonBody } from "../_shared/validators.ts";
import { logError, logSecurityEvent, internalError, forbidden, badRequest, maskEmail } from "../_shared/errors.ts";
import { getCorsHeaders, secureResponse } from "../_shared/security-headers.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders('*', req.headers.get('Origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify JWT authentication
    const auth = await verifyAuth(req, corsHeaders);
    if (auth.error) {
      logSecurityEvent('AUTH_FAILED', { endpoint: 'send-email' });
      return auth.error;
    }

    // SECURITY: Apply rate limiting
    const rateLimitResult = rateLimit(
      req,
      auth.user!.id,
      { 
        ipLimit: { windowMs: 60000, maxRequests: 10 },
        userLimit: { windowMs: 60000, maxRequests: 50 },
        keyPrefix: 'send-email' 
      },
      corsHeaders
    );
    
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMITED', { 
        endpoint: 'send-email', 
        userId: auth.user!.id 
      });
      return rateLimitResult.response!;
    }

    // SECURITY: Parse and validate input
    const { data: body, error: parseError } = await parseJsonBody(req, corsHeaders);
    if (parseError) return parseError;

    const validation = validateInput(SendEmailSchema, body, corsHeaders);
    if (!validation.success) return validation.error!;

    const { to, subject, body: emailBody, html: _html, conversationId, replyTo } = validation.data!;

    // If conversationId provided, verify access
    if (conversationId) {
      const { data: conversation, error: convError } = await auth.supabase!
        .from('conversations')
        .select('business_id')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        return badRequest('Invalid conversation ID', corsHeaders);
      }

      const businessId = conversation.business_id;
      
      // Verify business membership
      const isMember = await verifyBusinessMembership(auth.supabase!, auth.user!.id, businessId);
      if (!isMember) {
        logSecurityEvent('UNAUTHORIZED_ACCESS', { 
          endpoint: 'send-email',
          userId: auth.user!.id,
          conversationId 
        });
        return forbidden(corsHeaders, 'You do not have access to this conversation');
      }
    }

    // SECURITY: mask recipient addresses in diagnostics (no PII in logs)
    console.log('[EMAIL] Sending email:', {
      to: maskEmail(to),
      subject,
      bodyLength: emailBody.length,
      conversationId,
      replyTo: replyTo ? maskEmail(replyTo) : undefined,
      userId: auth.user!.id,
    });

    // In production, use service role client to store sent message
    if (conversationId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        content: emailBody,
        sender_type: 'agent',
        sender_id: auth.user!.id,
        content_type: 'text',
        status: 'sent',
        metadata: { 
          channel: 'email',
          subject,
          to,
          replyTo 
        },
      });
    }

    logSecurityEvent('EMAIL_SENT', { 
      userId: auth.user!.id,
      to,
      conversationId 
    });

    return secureResponse(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        messageId: crypto.randomUUID(), // Placeholder
      }),
      200,
      { ...corsHeaders, ...rateLimitResult.headers }
    );
  } catch (error) {
    logError('send-email function', error);
    return internalError(corsHeaders);
  }
});
