import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveBusinessId, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_customer",
  title: "Create customer",
  description: "Add a customer to the signed-in user's business.",
  inputSchema: {
    name: z.string().trim().min(1).max(120).describe("Customer name."),
    phone: z.string().trim().max(30).optional().describe("Phone number, e.g. +2547...."),
    email: z.string().trim().email().max(160).optional().describe("Email address."),
    notes: z.string().trim().max(500).optional().describe("Optional internal notes."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, phone, email, notes }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const businessId = await resolveBusinessId(supabase, ctx.getUserId()!);
    if (!businessId) {
      return { content: [{ type: "text", text: "No business found for this account." }], isError: true };
    }
    const { data, error } = await supabase
      .from("customers")
      .insert({ business_id: businessId, name, phone: phone ?? null, email: email ?? null, notes: notes ?? null })
      .select("id, name, phone, email")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created customer ${data?.name} (${data?.id}).` }],
      structuredContent: { customer: data },
    };
  },
});
