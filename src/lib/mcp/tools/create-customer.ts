import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveBusinessId, supabaseForUser } from "../supabase";

/** Normalize Kenyan numbers to +254XXXXXXXXX; other numbers keep digits with a leading +. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  if (!digits) return null;
  let d = digits.startsWith("+") ? digits.slice(1) : digits;
  if (/^0[17]\d{8}$/.test(d)) d = "254" + d.slice(1);
  else if (/^[17]\d{8}$/.test(d)) d = "254" + d;
  if (!/^\d{7,15}$/.test(d)) return null;
  return "+" + d;
}

type Row = { id: string; name: string | null; phone: string | null; email: string | null };
const toJson = (r: Row) => ({ id: r.id, name: r.name, phone: r.phone, email: r.email });

export default defineTool({
  name: "create_customer",
  title: "Create customer",
  description:
    "Add a customer to the signed-in user's business. Safe to retry: an existing customer with the same phone or email is returned instead of creating a duplicate.",
  inputSchema: {
    name: z.string().trim().min(1).max(120).describe("Customer name."),
    phone: z.string().trim().max(30).optional().describe("Phone number, e.g. +2547... or 07..."),
    email: z.string().trim().email().max(160).optional().describe("Email address."),
    notes: z.string().trim().max(500).optional().describe("Optional internal notes."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ name, phone, email, notes }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const normPhone = phone ? normalizePhone(phone) : null;
    if (phone && !normPhone) throw new ToolError("Phone number is not valid.");
    const normEmail = email ? email.toLowerCase() : null;
    if (!normPhone && !normEmail) throw new ToolError("Provide a phone number or email so duplicates can be detected.");

    const supabase = supabaseForUser(ctx);
    const businessId = await resolveBusinessId(supabase, ctx.getUserId()!);
    if (!businessId) throw new ToolError("No business found for this account.");

    const findExisting = async (): Promise<Row | null> => {
      if (normPhone) {
        const { data } = await supabase.from("customers").select("id, name, phone, email")
          .eq("business_id", businessId).eq("phone", normPhone).limit(1).maybeSingle();
        if (data) return data as Row;
      }
      if (normEmail) {
        const { data } = await supabase.from("customers").select("id, name, phone, email")
          .eq("business_id", businessId).ilike("email", normEmail.replace(/[%_\\]/g, "\\$&")).limit(1).maybeSingle();
        if (data) return data as Row;
      }
      return null;
    };

    const existing = await findExisting();
    if (existing) {
      return {
        content: [{ type: "text", text: `Customer already exists: ${existing.name ?? ""} (${existing.id}). No duplicate created.` }],
        structuredContent: { customer: toJson(existing), duplicate: true },
      };
    }

    const { data, error } = await supabase
      .from("customers")
      .insert({
        business_id: businessId,
        name,
        phone: normPhone,
        email: normEmail,
        notes: notes ?? null,
        channel_type: normPhone ? "sms" : "email",
      })
      .select("id, name, phone, email")
      .maybeSingle();
    if (error) {
      const again = await findExisting();
      if (again) {
        return {
          content: [{ type: "text", text: `Customer already exists (${again.id}).` }],
          structuredContent: { customer: toJson(again), duplicate: true },
        };
      }
      throw new ToolError("Could not create the customer.");
    }
    // The database merges matching customers automatically and may return no new row.
    const row = (data as Row | null) ?? (await findExisting());
    if (!row) throw new ToolError("Could not create the customer.");
    return {
      content: [{ type: "text", text: `Created customer ${row.name ?? ""} (${row.id}).` }],
      structuredContent: { customer: toJson(row), duplicate: false },
    };
  },
});
