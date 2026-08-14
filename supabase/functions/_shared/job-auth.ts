/**
 * Fail-closed authentication for scheduled/background jobs.
 *
 * A caller is allowed when it presents either:
 *  - the job's configured shared secret (env var + custom header), or
 *  - the per-job token stored in public.cron_job_secrets via `x-job-secret`
 *    (pg_cron reads it at run time; the admin trigger proxy forwards it).
 *
 * Anonymous callers with only the publishable key are rejected.
 */
export async function isAuthorizedJobCall(
  svc: { from: (t: string) => any },
  req: Request,
  jobName: string,
  opts?: { envSecretName?: string; secretHeader?: string },
): Promise<boolean> {
  if (opts?.envSecretName && opts.secretHeader) {
    const secret = Deno.env.get(opts.envSecretName);
    const provided = req.headers.get(opts.secretHeader);
    if (secret && provided === secret) return true;
  }

  const jobSecret = req.headers.get("x-job-secret");
  if (!jobSecret) return false;

  try {
    const { data } = await svc
      .from("cron_job_secrets")
      .select("secret")
      .eq("job_name", jobName)
      .maybeSingle();
    return Boolean(data?.secret) && data.secret === jobSecret;
  } catch (_) {
    return false;
  }
}

export function unauthorizedJobResponse(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
