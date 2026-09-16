import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveBusinessId, supabaseForUser } from "../supabase";

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
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const businessId = await resolveBusinessId(supabase, ctx.getUserId()!);
    if (!businessId) {
      return { content: [{ type: "text", text: "No business found for this account." }], isError: true };
    }
    let query = supabase
      .from("customers")
      .select("id, name, phone, email, tags, total_spent, last_contact_at, created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { customers: data ?? [] },
    };
  },
});
