import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { verifyAuth, verifyBusinessMembership, createServiceClient } from "../_shared/auth.ts";
import { getCorsHeaders, secureResponse } from "../_shared/security-headers.ts";
import { badRequest, forbidden, internalError, logError, logSecurityEvent } from "../_shared/errors.ts";
import { parseJsonBody, validateInput, uuidSchema } from "../_shared/validators.ts";

const InputSchema = z.object({
  conversation_id: uuidSchema,
  content: z.string().trim().min(1).max(4096),
}).strict();

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders("*", req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return badRequest("Method not allowed", corsHeaders);

  try {
    const auth = await verifyAuth(req, corsHeaders);
    if (auth.error || !auth.user || !auth.supabase) return auth.error!;
    const parsed = await parseJsonBody(req, corsHeaders);
    if (parsed.error) return parsed.error;
    const input = validateInput(InputSchema, parsed.data, corsHeaders);
    if (!input.success || !input.data) return input.error!;

    const { data: conversation, error: conversationError } = await auth.supabase
      .from("conversations")
      .select("id, business_id, customer_id, channel_id, channel_type, metadata")
      .eq("id", input.data.conversation_id)
      .eq("channel_type", "telegram")
      .maybeSingle();
    if (conversationError || !conversation) return badRequest("Telegram conversation not found", corsHeaders);
    if (!(await verifyBusinessMembership(auth.supabase, auth.user.id, conversation.business_id))) return forbidden(corsHeaders, "Business access denied");

    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!token) return new Response(JSON.stringify({ error: { code: "TELEGRAM_NOT_CONFIGURED", message: "Telegram server secret is not configured" } }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    // SECURITY: the destination chat is derived ONLY from the customer record that
    // telegram-webhook bound when the inbound message arrived. conversation.metadata
    // is writable by business members, so it must never decide where a message goes.
    const metadata = (conversation.metadata || {}) as Record<string, unknown>;
    const { data: customer } = await auth.supabase
      .from("customers")
      .select("external_id")
      .eq("id", conversation.customer_id)
      .maybeSingle();
    const externalId = customer?.external_id || "";
    const chatId = externalId.startsWith("telegram:") ? externalId.slice("telegram:".length) : null;
    if (typeof metadata.telegram_chat_id === "string" && chatId && metadata.telegram_chat_id !== chatId) {
      logSecurityEvent("telegram_chat_redirect_blocked", {
        conversationId: conversation.id,
        businessId: conversation.business_id,
        userId: auth.user.id,
      });
    }
    if (!chatId) return badRequest("Telegram chat is not mapped to this conversation", corsHeaders);

    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: input.data.content, disable_web_page_preview: true }),
    });
    const telegramData = await telegramResponse.json() as { ok?: boolean; result?: { message_id?: number }; description?: string };
    if (!telegramResponse.ok || !telegramData.ok || !telegramData.result) {
      logSecurityEvent("telegram_send_failed", { conversationId: conversation.id, status: telegramResponse.status });
      return new Response(JSON.stringify({ error: { code: "TELEGRAM_DELIVERY_FAILED", message: "Telegram could not deliver the message" } }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createServiceClient();
    const { data: savedMessage, error: saveError } = await service.from("messages").insert({
      conversation_id: conversation.id,
      sender_type: "agent",
      sender_id: auth.user.id,
      content: input.data.content,
      content_type: "text",
      status: "sent",
      external_id: telegramData.result.message_id ? `telegram:${telegramData.result.message_id}` : null,
      metadata: { channel: "telegram", telegram_chat_id: chatId },
    }).select("id, conversation_id, sender_type, content, content_type, status, external_id, metadata, created_at").single();
    if (saveError) throw saveError;

    await service.from("conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: input.data.content.slice(0, 100),
    }).eq("id", conversation.id);
    logSecurityEvent("telegram_message_sent", { businessId: conversation.business_id, conversationId: conversation.id, userId: auth.user.id });
    return secureResponse(JSON.stringify({ success: true, message: savedMessage }), 200, corsHeaders);
  } catch (error) {
    logError("telegram-send", error);
    return internalError(corsHeaders);
  }
});
