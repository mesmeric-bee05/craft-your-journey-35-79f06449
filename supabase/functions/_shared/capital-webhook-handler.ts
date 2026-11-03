/**
 * Single source of truth for processing a Capital partner webhook event.
 *
 * Used by both the live `capital-partner-webhook` endpoint and the admin
 * `replay_webhook` action so live and replayed events can never diverge.
 */

export interface CapitalEventBody {
  event?: string;
  advance_id?: string;
  amount_kes?: number;
  reference?: string;
  status?: string;
  occurred_at?: string;
}

export interface CapitalEventOutcome {
  ok: boolean;
  code: string;
  detail?: Record<string, unknown>;
}

const ALLOWED_ADVANCE_STATUSES = new Set(["active", "repaid", "defaulted"]);

/**
 * SECURITY: partner-supplied free text ends up in audit records that admins
 * download as CSV. Strip spreadsheet-formula and control characters so a
 * crafted reference can never execute as a formula when the export is opened.
 */
export function sanitizeEventText(value: string | undefined | null): string | null {
  if (!value) return null;
  const cleaned = value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[=+@]/g, " ")
    .replace(/^-+/, "")
    .trim()
    .slice(0, 120);
  return cleaned || null;
}

/** Deterministic dedupe key for an inbound partner delivery. */
export async function computeDedupeKey(
  partnerId: string,
  body: CapitalEventBody,
  rawBody: string,
): Promise<string> {
  const seed = [
    partnerId,
    body.event ?? "",
    body.advance_id ?? "",
    body.reference ?? "",
    body.occurred_at ?? "",
  ].join("|");
  const basis = body.reference ? seed : `${seed}|${rawBody}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(basis));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// deno-lint-ignore no-explicit-any
export async function handleCapitalEvent(
  svc: any,
  body: CapitalEventBody,
  partnerId: string | null,
): Promise<CapitalEventOutcome> {
  if (!body.advance_id) return { ok: false, code: "advance_id_required" };

  const { data: advance } = await svc.from("capital_advances")
    .select("id, business_id, status, partner_id")
    .eq("id", body.advance_id)
    .maybeSingle();
  if (!advance) return { ok: false, code: "advance_not_found" };

  // Partner authority: an authenticated partner may only act on advances
  // assigned to it. Never trust the request-supplied advance_id alone.
  if (partnerId) {
    if (!advance.partner_id || advance.partner_id !== partnerId) {
      return { ok: false, code: "advance_not_authorized" };
    }
  }

  if (body.event === "repayment.recorded") {
    if (!body.amount_kes || body.amount_kes <= 0) {
      return { ok: false, code: "amount_kes_required" };
    }
    const { data, error } = await svc.rpc("record_capital_repayment", {
      p_advance_id: body.advance_id,
      p_amount: body.amount_kes,
      p_reference: body.reference ?? null,
      p_source: "partner",
      p_partner_id: partnerId,
      p_checkout_request_id: null,
    });
    if (error) return { ok: false, code: error.message ?? "repayment_failed" };
    return { ok: true, code: "repayment_recorded", detail: { repayment_id: data } };
  }

  if (body.event === "advance.written_off") {
    await svc.from("capital_advances").update({
      status: "defaulted", closed_at: new Date().toISOString(),
    }).eq("id", body.advance_id);
    await svc.from("capital_audit").insert({
      business_id: advance.business_id,
      action: "capital.advance.written_off",
      entity_type: "capital_advance",
      entity_id: body.advance_id,
      metadata: { partner_id: partnerId, reference: body.reference ?? null },
    });
    return { ok: true, code: "written_off" };
  }

  if (body.event === "advance.status" && body.status) {
    await svc.from("capital_advances")
      .update({ status: body.status })
      .eq("id", body.advance_id);
    await svc.from("capital_audit").insert({
      business_id: advance.business_id,
      action: "capital.advance.status",
      entity_type: "capital_advance",
      entity_id: body.advance_id,
      metadata: { partner_id: partnerId, new_status: body.status },
    });
    return { ok: true, code: "status_updated", detail: { status: body.status } };
  }

  return { ok: false, code: "unhandled_event" };
}
