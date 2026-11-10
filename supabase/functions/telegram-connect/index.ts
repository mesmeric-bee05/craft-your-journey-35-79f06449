import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { verifyAuth, verifyBusinessMembership, createServiceClient } from "../_shared/auth.ts";
import { getCorsHeaders, secureResponse } from "../_shared/security-headers.ts";
import { badRequest, internalError, logError, logSecurityEvent } from "../_shared/errors.ts";
import { parseJsonBody, validateInput, uuidSchema } from "../_shared/validators.ts";

const InputSchema = z.object({
  business_id: uuidSchema,
  channel_name: z.string().trim().min(1).max(120).optional(),
}).strict();

const TELEGRAM_API = "https://api.telegram.org";

async function telegramCall<T>(token: string, method: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json() as { ok?: boolean; result?: T; description?: string };
  if (!response.ok || !data.ok || !data.result) throw new Error(data.description || `Telegram ${method} failed`);
  return data.result;
}

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
    if (!(await verifyBusinessMembership(auth.supabase, auth.user.id, input.data.business_id))) {
      return new Response(JSON.stringify({ error: { code: "FORBIDDEN", message: "Business access denied" } }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const webhookSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
    if (!token || !webhookSecret) {
      return new Response(JSON.stringify({ error: { code: "TELEGRAM_NOT_CONFIGURED", message: "Telegram server secrets are not configured" } }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bot = await telegramCall<{ id: number; is_bot: boolean; first_name: string; username?: string }>(token, "getMe", {});
    if (!bot.is_bot) return badRequest("Telegram credential is not a bot token", corsHeaders);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) return internalError(corsHeaders);
    const webhookUrl = `${supabaseUrl}/functions/v1/telegram-webhook`;
    await telegramCall(token, "setWebhook", {
      url: webhookUrl,
      secret_token: webhookSecret,
      allowed_updates: ["message"],
      drop_pending_updates: false,
    });

    const service = createServiceClient();
    const { data: channel, error } = await service
      .from("social_channels")
      .upsert({
        business_id: input.data.business_id,
        channel_type: "telegram",
        channel_name: input.data.channel_name || bot.username || bot.first_name,
        channel_id: String(bot.id),
        is_connected: true,
        is_active: true,
        connected_at: new Date().toISOString(),
        metadata: {
          provider: "telegram_bot_api",
          bot_id: bot.id,
          bot_username: bot.username || null,
          webhook_url: webhookUrl,
          token_configured: true,
        },
      }, { onConflict: "business_id,channel_type" })
      .select("id, business_id, channel_type, channel_name, channel_id, is_connected, is_active, connected_at, metadata")
      .single();
    if (error) throw error;

    logSecurityEvent("telegram_channel_connected", {
      businessId: input.data.business_id,
      channelId: channel.id,
      botId: bot.id,
      botUsername: bot.username || null,
    });
    return secureResponse(JSON.stringify({ success: true, channel }), 200, corsHeaders);
  } catch (error) {
    logError("telegram-connect", error);
    return new Response(JSON.stringify({ error: { code: "TELEGRAM_CONNECTION_FAILED", message: "Telegram connection could not be completed" } }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
