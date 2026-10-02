import { defineTool, ToolError } from "@lovable.dev/mcp-js";
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
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const businessId = await resolveBusinessId(supabase, ctx.getUserId()!);
    if (!businessId) throw new ToolError("No business found for this account.");
    const { data, error } = await supabase
      .from("products")
      .select("id, name, sku, price, stock_quantity, reorder_level, category, is_active")
      .eq("business_id", businessId)
      .order("name", { ascending: true })
      .limit(lowStockOnly ? 500 : (limit ?? 25));
    if (error) throw new ToolError("Could not load products.");

    const products = (data ?? [])
      .filter((p) => !lowStockOnly || Number(p.stock_quantity ?? 0) <= Number(p.reorder_level ?? 0))
      .slice(0, limit ?? 25)
      .map((p) => ({
        id: String(p.id),
        name: String(p.name ?? ""),
        sku: p.sku == null ? null : String(p.sku),
        price: Number(p.price ?? 0),
        stock_quantity: Number(p.stock_quantity ?? 0),
        reorder_level: Number(p.reorder_level ?? 0),
        category: p.category == null ? null : String(p.category),
        is_active: Boolean(p.is_active),
      }));
    return {
      content: [{ type: "text", text: JSON.stringify(products) }],
      structuredContent: { products },
    };
  },
});
