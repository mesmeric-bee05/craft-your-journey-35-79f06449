/**
 * Secure download helper.
 *
 * Centralises file downloads from Supabase storage so we always:
 *   1. Verify the caller is authenticated.
 *   2. Use a short-lived signed URL for private buckets (RLS enforced).
 *   3. Record the download (or denial) in the audit log.
 *
 * Components MUST use `secureDownload` instead of constructing storage URLs
 * by hand. This stops users from "guessing" paths in the URL bar even when
 * routing protections are bypassed.
 */
import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent } from '@/lib/auditLog';

export interface SecureDownloadOptions {
  bucket: string;
  path: string;
  /** Suggested filename when triggering a browser download. */
  filename?: string;
  /** Force a download instead of opening in a new tab. */
  triggerDownload?: boolean;
  /** Business this download is scoped to (for audit logs). */
  businessId?: string;
  /** Signed URL TTL in seconds (default 60s). */
  expiresIn?: number;
}

export class DownloadDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DownloadDeniedError';
  }
}

export async function secureDownload(opts: SecureDownloadOptions): Promise<string> {
  const { bucket, path, filename, triggerDownload = true, businessId, expiresIn = 60 } = opts;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    await logAuditEvent('file.download.denied', {
      entityType: 'storage_object',
      metadata: { bucket, path, reason: 'not_authenticated' },
      businessId,
    });
    throw new DownloadDeniedError('You must sign in to download this file.');
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn, filename ? { download: filename } : undefined);

  if (error || !data?.signedUrl) {
    await logAuditEvent('file.download.denied', {
      entityType: 'storage_object',
      metadata: { bucket, path, reason: error?.message ?? 'no_signed_url' },
      businessId,
    });
    throw new DownloadDeniedError(
      'You do not have permission to access this file or it no longer exists.',
    );
  }

  await logAuditEvent('file.download', {
    entityType: 'storage_object',
    metadata: { bucket, path, filename: filename ?? null },
    businessId,
  });

  if (triggerDownload && typeof window !== 'undefined') {
    const a = document.createElement('a');
    a.href = data.signedUrl;
    if (filename) a.download = filename;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return data.signedUrl;
}
