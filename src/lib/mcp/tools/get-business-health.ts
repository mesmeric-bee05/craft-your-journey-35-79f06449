import { defineTool } from "@lovable.dev/mcp-js";
import { resolveBusinessId, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_business_health",
  title: "Get SmartReach score",
  description: "Get the signed-in user's latest SmartReach business health score and category breakdown.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const businessId = await resolveBusinessId(supabase, ctx.getUserId()!);
    if (!businessId) {
      return { content: [{ type: "text", text: "No business found for this account." }], isError: true };
    }
    const { data, error } = await supabase
      .from("business_health_score")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: "No score has been calculated yet." }] };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { score: data },
    };
  },
});
