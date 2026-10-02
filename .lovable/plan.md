# Finish SmartReach MCP integration (4 authenticated tools only)

## Scope
Keep exactly four tools: list_customers, list_products, get_business_health, create_customer. No public access, no new tools.

## 1. Turn on agent sign-in
- Enable the OAuth 2.1 authorization server (with dynamic client registration) for the backend.
- If enabling fails, stop and report the exact missing prerequisite.

## 2. Harden the four tools
- All tools: require a verified OAuth caller, use the user-scoped client (RLS runs as the caller), resolve business via owner/active membership only, never accept user_id/business_id from input.
- Minimum fields, explicit JSON mappers:
  - list_customers: id, name, phone, email, tags, total_spent, last_contact_at, created_at. Escape `%`, `,`, `(`, `)` in search to prevent filter injection.
  - list_products: id, name, sku, price, stock_quantity, reorder_level, category, is_active; low-stock filter applied in query where possible.
  - get_business_health: replace `select("*")` with explicit score + category columns and calculated timestamp only.
  - create_customer: return id, name, phone, email only.
- No access to wellness/Biashara Mind, crisis, wallet, M-Pesa, Capital, or secrets tables anywhere in src/lib/mcp.
- Throw `ToolError` with plain messages for missing business / validation failures.

## 3. Make create_customer retry-safe
- Normalize phone (Kenyan +254 format) and lowercase email; require at least one of phone or email in addition to name.
- Optional `idempotencyKey` input.
- Before insert, look up an existing customer in the same business with matching phone or email; return it with `duplicate: true` instead of inserting.
- Add a database migration with partial unique indexes on (business_id, normalized phone) and (business_id, lower(email)) after checking existing rows for duplicates; on unique-violation, re-read and return the existing row. If existing duplicates block the index, report counts and keep the in-code check only.

## 4. "Connect your AI assistant" page
- New mobile-first page at /settings/ai-assistant (inside DashboardLayout), linked from a new Settings tab and from the Help Center.
- Content: MCP URL derived at runtime with copy button; sign-in and approval explanation; Claude, ChatGPT, Claude Code (copyable command), other MCP clients steps; permission review reminder (what the 4 tools can do, including that one adds customers); refresh/reconnect after publishing; troubleshooting (sign-in loop, "No business found", tools missing, wrong URL, revoking access).
- Uses existing design tokens and components.

## 5. Verify and publish
- Regenerate the MCP manifest and review all four schemas.
- Run full build and TypeScript typecheck; fix failures.
- Focused security tests: unauthenticated MCP call returns 401; source check that src/lib/mcp references no service-role key and no sensitive tables; duplicate create returns the existing customer.
- Publish the app so the endpoint is live; report only what the publish result confirms.
- Update AGENTS.md and roadmap.md.

## Prerequisites that may block
- OAuth server activation on the backend.
- Publishing permission. RESEND_API_KEY / SECURITY_ALERT_FROM remain outstanding but are unrelated to this release.
