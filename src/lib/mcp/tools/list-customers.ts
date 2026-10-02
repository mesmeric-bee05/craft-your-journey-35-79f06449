import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveBusinessId, supabaseForUser } from "../supabase";

// Strip characters that carry meaning in PostgREST filter syntax.
const safeSearch = (s: string) => s.replace(/[%,()*\\:."']/g, " ").trim();

export default defineTool({
  name: "list_customers",
  title: "List customers",
  description: "List customers for the signed-in user's business, newest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(20).describe("How many customers to return."),
    search: z.string().trim().max(100).optional().describe("Optional name or phone filter."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, search }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const businessId = await resolveBusinessId(supabase, ctx.getUserId()!);
    if (!businessId) throw new ToolError("No business found for this account.");
    let query = supabase
      .from("customers")
      .select("id, name, phone, email, tags, last_contact_at, created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    const term = search ? safeSearch(search) : "";
    if (term) query = query.or(`name.ilike.*${term}*,phone.ilike.*${term}*`);

    const { data, error } = await query;
    if (error) throw new ToolError("Could not load customers.");
    const customers = (data ?? []).map((c) => ({
      id: c.id as string,
      name: (c.name as string | null) ?? null,
      phone: (c.phone as string | null) ?? null,
      email: (c.email as string | null) ?? null,
      tags: ((c.tags as string[] | null) ?? []).map((t) => String(t)),
      last_contact_at: (c.last_contact_at as string | null) ?? null,
      created_at: c.created_at as string,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(customers) }],
      structuredContent: { customers },
    };
  },
});
