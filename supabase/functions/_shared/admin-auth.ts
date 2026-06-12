/**
 * Shared admin-auth helper for edge functions.
 * Verifies the caller is an authenticated admin and returns the user id.
 * Returns null on failure (caller should respond 401/403).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function requireAdmin(req: Request): Promise<{ userId: string; ip: string | null; ua: string | null } | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!jwt) return null;
  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return null;
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ok } = await svc.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (!ok) return null;
  return {
    userId: u.user.id,
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? null,
    ua: req.headers.get("user-agent") ?? null,
  };
}
