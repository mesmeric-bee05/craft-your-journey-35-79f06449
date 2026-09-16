import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveBusinessId, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_products",
  title: "List products and stock",
  description: "List the signed-in user's products with price and current stock level.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(25).describe("How many products to return."),
    lowStockOnly: z.boolean().default(false).describe("Only return products at or below their reorder level."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, lowStockOnly }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const businessId = await resolveBusinessId(supabase, ctx.getUserId()!);
    if (!businessId) {
      return { content: [{ type: "text", text: "No business found for this account." }], isError: true };
    }
    const { data, error } = await supabase
      .from("products")
      .select("id, name, sku, price, stock_quantity, reorder_level, category, is_active")
      .eq("business_id", businessId)
      .order("name", { ascending: true })
      .limit(limit ?? 25);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = (data ?? []).filter((p) =>
      lowStockOnly
        ? Number(p.stock_quantity ?? 0) <= Number(p.reorder_level ?? 0)
        : true,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { products: rows },
    };
  },
});
