import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { resolveBusinessId, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_business_health",
  title: "Get SmartReach score",
  description: "Get the signed-in user's latest SmartReach business health score and category breakdown.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const businessId = await resolveBusinessId(supabase, ctx.getUserId()!);
    if (!businessId) throw new ToolError("No business found for this account.");
    const { data, error } = await supabase
      .from("business_health_score")
      .select("overall, engagement_component, growth_component, inventory_component, voc_component, computed_at")
      .eq("business_id", businessId)
      .maybeSingle();
    if (error) throw new ToolError("Could not load the SmartReach score.");
    if (!data) return { content: [{ type: "text", text: "No score has been calculated yet." }] };
    const score = {
      overall: Number(data.overall),
      engagement: Number(data.engagement_component),
      growth: Number(data.growth_component),
      inventory: Number(data.inventory_component),
      voice_of_customer: Number(data.voc_component),
      computed_at: String(data.computed_at),
    };
    return { content: [{ type: "text", text: JSON.stringify(score) }], structuredContent: { score } };
  },
});
