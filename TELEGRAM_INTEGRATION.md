# SmartReach AI Telegram Integration

## Security status

The Telegram bot token and `api_hash` previously pasted into chat must be considered compromised. Revoke the bot token in BotFather, generate a replacement, and rotate the Telegram application `api_hash`. Do not add either value to Git, the React app, browser storage, or public database columns.

## Supabase secrets

Set these only in Supabase Edge Function secrets:

- `TELEGRAM_BOT_TOKEN`: replacement BotFather token
- `TELEGRAM_WEBHOOK_SECRET`: a new random 32-byte value, for example generated with `openssl rand -hex 32`

The Edge Functions also use the standard Supabase-provided secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

## Implemented functions

- `telegram-connect`: authenticated setup. Verifies the bot with `getMe`, registers the webhook, and stores only non-secret bot metadata against the authenticated business's Telegram channel.
- `telegram-webhook`: public Telegram endpoint. Requires `X-Telegram-Bot-Api-Secret-Token`, verifies the active bot/channel ownership, deduplicates Telegram `update_id`, maps the Telegram chat to a customer and conversation, and persists inbound messages.
- `telegram-send`: authenticated outbound delivery. Verifies business membership, resolves the Telegram chat mapping, calls `sendMessage`, and persists the agent message only after Telegram accepts it.

## Database migration

Apply `supabase/migrations/20261110123000_telegram_integration.sql` before enabling the functions. It creates the service-only `telegram_update_events` ledger used for replay protection and operational auditability.

## Connection flow

1. Deploy the migration.
2. Deploy the three Edge Functions.
3. Add the two rotated secrets in Supabase.
4. Sign in to SmartReach and choose **Settings → Channels → Telegram → Connect**.
5. The setup function calls `getMe`, calls `setWebhook`, and creates or updates the Telegram channel for the current business.
6. Send `/start` or a text message to the bot.
7. Confirm the customer, conversation, and message appear in SmartReach Inbox.
8. Reply from the Inbox and confirm the reply arrives in Telegram and is persisted as an agent message.

## Webhook endpoint

The registered endpoint is:

`<SUPABASE_URL>/functions/v1/telegram-webhook`

Telegram authenticates the request using the `X-Telegram-Bot-Api-Secret-Token` header. The function is intentionally configured with `verify_jwt = false` because Telegram cannot provide a Supabase JWT; application-level secret validation remains mandatory.

## Scope of the first pilot

The implementation intentionally supports text messages first. Unsupported Telegram update types are acknowledged without creating malformed inbox records. Media, groups, inline mode, secretary mode, and bot-to-bot communication should remain disabled until their consent, storage, moderation, and product requirements are separately defined.
