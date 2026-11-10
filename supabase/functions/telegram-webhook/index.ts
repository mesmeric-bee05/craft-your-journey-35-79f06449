import { createServiceClient } from "../_shared/auth.ts";
import { getCorsHeaders, secureResponse } from "../_shared/security-headers.ts";
import { badRequest, internalError, logError, logSecurityEvent } from "../_shared/errors.ts";

const MAX_BODY_BYTES = 1024 * 1024;

function safeEqual(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function textFromMessage(message: Record<string, unknown>): string | null {
  const text = typeof message.text === "string" ? message.text : null;
  if (text) return text.slice(0, 10000);
  const caption = typeof message.caption === "string" ? message.caption : null;
  return caption ? caption.slice(0, 10000) : null;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders("*", req.headers.get("Origin"));
  if (req.method !== "POST") return badRequest("Method not allowed", corsHeaders);

  const expectedSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  const suppliedSecret = req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
  if (!expectedSecret || !safeEqual(suppliedSecret, expectedSecret)) {
    logSecurityEvent("telegram_webhook_rejected", { reason: "invalid_secret" });
    return secureResponse(JSON.stringify({ ok: false }), 401, corsHeaders);
  }

  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return badRequest("Payload too large", corsHeaders);
    const update = JSON.parse(raw) as Record<string, unknown>;
    const updateId = Number(update.update_id);
    if (!Number.isSafeInteger(updateId) || updateId < 0) return badRequest("Invalid Telegram update", corsHeaders);

    const message = (update.message && typeof update.message === "object") ? update.message as Record<string, unknown> : null;
    if (!message) return secureResponse(JSON.stringify({ ok: true, ignored: true }), 200, corsHeaders);
    const chat = (message.chat && typeof message.chat === "object") ? message.chat as Record<string, unknown> : null;
    const from = (message.from && typeof message.from === "object") ? message.from as Record<string, unknown> : null;
    const chatId = chat?.id;
    if (typeof chatId !== "number" && typeof chatId !== "string") return badRequest("Telegram chat is missing", corsHeaders);
    const content = textFromMessage(message);
    if (!content) return secureResponse(JSON.stringify({ ok: true, ignored: true }), 200, corsHeaders);

    const service = createServiceClient();
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!token) return internalError(corsHeaders);
    const botResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const botData = await botResponse.json() as { ok?: boolean; result?: { id?: number } };
    const botId = botData.result?.id;
    if (!botData.ok || !botId) return internalError(corsHeaders);

    const { data: channel, error: channelError } = await service
      .from("social_channels")
      .select("id, business_id, channel_id, is_connected, is_active")
      .eq("channel_type", "telegram")
      .eq("channel_id", String(botId))
      .eq("is_connected", true)
      .eq("is_active", true)
      .maybeSingle();
    if (channelError || !channel) {
      logSecurityEvent("telegram_webhook_unknown_bot", { botId });
      return secureResponse(JSON.stringify({ ok: true }), 200, corsHeaders);
    }

    const { error: ledgerError } = await service.from("telegram_update_events").insert({
      update_id: updateId,
      business_id: channel.business_id,
      channel_id: channel.id,
      raw_update: update,
      status: "received",
    });
    if (ledgerError) {
      // Unique update_id means Telegram retries are acknowledged without duplication.
      if (ledgerError.code === "23505") return secureResponse(JSON.stringify({ ok: true, duplicate: true }), 200, corsHeaders);
      throw ledgerError;
    }

    const externalId = `telegram:${String(chatId)}`;
    const firstName = typeof from?.first_name === "string" ? from.first_name : "";
    const lastName = typeof from?.last_name === "string" ? from.last_name : "";
    const username = typeof from?.username === "string" ? from.username : null;
    const displayName = `${firstName} ${lastName}`.trim() || username || `Telegram user ${String(chatId)}`;
    const avatar = username ? `https://t.me/i/userpic/320/${username}.jpg` : null;

    const { data: customer, error: customerError } = await service
      .from("customers")
      .upsert({
        business_id: channel.business_id,
        external_id: externalId,
        channel_type: "telegram",
        name: displayName,
        avatar_url: avatar,
        metadata: { telegram_chat_id: String(chatId), telegram_username: username, telegram_user_id: from?.id ?? null },
        last_contact_at: new Date().toISOString(),
      }, { onConflict: "business_id,channel_type,external_id" })
      .select("id")
      .single();
    if (customerError || !customer) throw customerError || new Error("Customer mapping failed");

    const found = await service.from("conversations")
      .select("id, unread_count")
      .eq("business_id", channel.business_id)
      .eq("channel_id", channel.id)
      .eq("customer_id", customer.id)
      .eq("channel_type", "telegram")
      .in("status", ["open", "pending"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (found.error) throw found.error;

    let resolvedConversation = found.data;
    if (!resolvedConversation) {
      const created = await service.from("conversations").insert({
        business_id: channel.business_id,
        customer_id: customer.id,
        channel_id: channel.id,
        channel_type: "telegram",
        status: "open",
        metadata: { telegram_chat_id: String(chatId) },
        last_message_at: new Date().toISOString(),
        last_message_preview: content.slice(0, 100),
        unread_count: 1,
      }).select("id, unread_count").single();
      if (created.error || !created.data) throw created.error || new Error("Conversation creation failed");
      resolvedConversation = created.data;
    }

    const telegramMessageId = Number(message.message_id);
    const { error: messageError } = await service.from("messages").insert({
      conversation_id: resolvedConversation.id,
      sender_type: "customer",
      content,
      content_type: "text",
      status: "delivered",
      external_id: Number.isSafeInteger(telegramMessageId) ? `telegram:${telegramMessageId}` : null,
      metadata: { channel: "telegram", telegram_chat_id: String(chatId), telegram_update_id: updateId, telegram_username: username },
    });
    if (messageError) throw messageError;

    await service.from("conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content.slice(0, 100),
      unread_count: (resolvedConversation.unread_count ?? 0) + 1,
    }).eq("id", resolvedConversation.id);
    await service.from("telegram_update_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("update_id", updateId);
    logSecurityEvent("telegram_message_persisted", { businessId: channel.business_id, updateId, conversationId: resolvedConversation.id });
    return secureResponse(JSON.stringify({ ok: true }), 200, corsHeaders);
  } catch (error) {
    logError("telegram-webhook", error);
    return secureResponse(JSON.stringify({ ok: false }), 200, corsHeaders);
  }
});
