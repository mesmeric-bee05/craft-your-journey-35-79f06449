// Partner API sync endpoint. No JWT; validates X-Sacco-Api-Key.
// POST/PUT body: { members: [{ external_member_id, full_name, phone?, email?, joined_at?, metadata? }, ...] }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const MemberSchema = z.object({
  external_member_id: z.string().min(1).max(120),
  full_name: z.string().min(1).max(200),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  joined_at: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
  status: z.enum(["imported", "invited", "claimed", "inactive"]).optional(),
});

const BodySchema = z.object({
  members: z.array(MemberSchema).min(1).max(1000),
});

const RATE_LIMIT_PER_HOUR = 60;

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("254")) return "+" + digits;
  if (digits.startsWith("0") && digits.length === 10) return "+254" + digits.slice(1);
  return digits.length >= 9 ? "+" + digits : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "PUT") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = req.headers.get("X-Sacco-Api-Key") ?? "";
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "missing_api_key" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const keyHash = await sha256Hex(apiKey);
  const { data: sacco, error: saccoErr } = await supabase
    .from("saccos")
    .select("id, name")
    .eq("api_key_hash", keyHash)
    .maybeSingle();

  if (saccoErr || !sacco) {
    return new Response(JSON.stringify({ error: "invalid_api_key" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limit
  const { data: rl } = await supabase
    .from("sacco_api_rate_limits")
    .select("*")
    .eq("sacco_id", sacco.id)
    .maybeSingle();
  const now = new Date();
  if (rl) {
    const windowStart = new Date(rl.window_started_at);
    const withinWindow = now.getTime() - windowStart.getTime() < 3600_000;
    if (withinWindow && rl.invocation_count >= RATE_LIMIT_PER_HOUR) {
      return new Response(JSON.stringify({ error: "rate_limited", retry_after_seconds: 3600 - Math.floor((now.getTime() - windowStart.getTime()) / 1000) }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await supabase
      .from("sacco_api_rate_limits")
      .update({
        window_started_at: withinWindow ? rl.window_started_at : now.toISOString(),
        invocation_count: withinWindow ? rl.invocation_count + 1 : 1,
        last_invoked_at: now.toISOString(),
      })
      .eq("sacco_id", sacco.id);
  } else {
    await supabase.from("sacco_api_rate_limits").insert({
      sacco_id: sacco.id,
      window_started_at: now.toISOString(),
      invocation_count: 1,
      last_invoked_at: now.toISOString(),
    });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const importRow = await supabase
    .from("sacco_imports")
    .insert({
      sacco_id: sacco.id,
      source: "api",
      row_count: parsed.data.members.length,
    })
    .select("id")
    .single();

  const errors: Array<{ external_member_id: string; error: string }> = [];
  let created = 0;
  let updated = 0;

  for (const m of parsed.data.members) {
    const phone = normalizePhone(m.phone);
    const row = {
      sacco_id: sacco.id,
      external_member_id: m.external_member_id,
      full_name: m.full_name,
      phone,
      email: m.email ?? null,
      joined_at: m.joined_at ?? null,
      status: m.status ?? "imported",
      metadata: m.metadata ?? {},
    };
    const { data: existing } = await supabase
      .from("sacco_members")
      .select("id")
      .eq("sacco_id", sacco.id)
      .eq("external_member_id", m.external_member_id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("sacco_members").update(row).eq("id", existing.id);
      if (error) errors.push({ external_member_id: m.external_member_id, error: error.message });
      else updated += 1;
    } else {
      const { error } = await supabase.from("sacco_members").insert(row);
      if (error) errors.push({ external_member_id: m.external_member_id, error: error.message });
      else created += 1;
    }
  }

  await supabase
    .from("sacco_imports")
    .update({
      created_count: created,
      updated_count: updated,
      error_count: errors.length,
      errors,
      finished_at: new Date().toISOString(),
    })
    .eq("id", importRow.data!.id);

  return new Response(
    JSON.stringify({
      sacco: sacco.name,
      import_id: importRow.data!.id,
      created,
      updated,
      errors,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
  );
});
