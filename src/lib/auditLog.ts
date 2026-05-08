/**
 * Client-side audit log helper.
 *
 * Records sensitive user actions (file downloads, secure RPC calls, role
 * changes, secret access) by calling the SECURITY DEFINER `log_user_action`
 * RPC. Failures are intentionally swallowed so they never block the UX —
 * the server is the source of truth for security-critical events.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export type AuditAction =
  | 'file.download'
  | 'file.download.denied'
  | 'rpc.security_definer.call'
  | 'auth.login'
  | 'auth.logout'
  | 'auth.mfa.verify'
  | 'role.change'
  | 'secret.access'
  | 'security.headers.view'
  | 'security.dashboard.view';

export interface AuditPayload {
  entityType?: string;
  entityId?: string;
  businessId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(
  action: AuditAction | string,
  payload: AuditPayload = {},
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_user_action', {
      p_action: action,
      p_entity_type: payload.entityType ?? null,
      p_entity_id: payload.entityId ?? null,
      p_business_id: payload.businessId ?? null,
      p_metadata: (payload.metadata ?? {}) as any,
    });
    if (error) {
      logger.warn('audit log failed', { action, error: error.message });
      return null;
    }
    return (data as string) ?? null;
  } catch (err: any) {
    logger.warn('audit log threw', { action, message: err?.message });
    return null;
  }
}

/** Wrap any SECURITY DEFINER RPC call to log the attempt + outcome. */
export async function callSecureRpc<T = unknown>(
  fn: string,
  args: Record<string, unknown>,
  opts: { businessId?: string } = {},
): Promise<{ data: T | null; error: unknown }> {
  const { data, error } = await (supabase.rpc as any)(fn, args);
  await logAuditEvent('rpc.security_definer.call', {
    entityType: 'rpc',
    businessId: opts.businessId,
    metadata: { fn, ok: !error, error: error ? String((error as any).message ?? error) : null },
  });
  return { data: data as T | null, error };
}
