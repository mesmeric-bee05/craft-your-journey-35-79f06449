/**
 * Lightweight security headers staging check.
 *
 * Run against a deployed environment to confirm CSP and related headers are
 * applied to the served HTML. Exits non-zero (and prints a summary) on any
 * required-header failure so it can gate a staging deploy.
 *
 * Usage:
 *   bun scripts/check-security-headers.ts https://staging.smartreach.ai
 *   bun scripts/check-security-headers.ts            # defaults to localhost preview
 */
import { diagnoseHeaders } from '../src/lib/securityHeaders';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const target = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:8080';

async function main() {
  console.log(`🔍 Checking security headers on ${target}`);
  let res: Response;
  try {
    res = await fetch(target, { method: 'GET', cache: 'no-store' });
  } catch (e) {
    console.error('❌ Could not reach target:', (e as Error).message);
    process.exit(2);
  }

  // Merge HTTP response headers with <meta http-equiv="..."> tags from the HTML
  // (CSP/HSTS may be configured either way depending on the host).
  const merged: Record<string, string | null> = {};
  res.headers.forEach((value, name) => { merged[name.toLowerCase()] = value; });

  const html = await res.text();
  const metaRegex = /<meta\s+http-equiv=["']([^"']+)["']\s+content=["']([^"']+)["']/gi;
  for (const match of html.matchAll(metaRegex)) {
    const key = match[1].toLowerCase();
    if (!merged[key]) merged[key] = match[2];
  }
  const refMatch = html.match(/<meta\s+name=["']referrer["']\s+content=["']([^"']+)["']/i);
  if (refMatch && !merged['referrer-policy']) merged['referrer-policy'] = refMatch[1];

  const results = diagnoseHeaders(merged);
  let failed = 0;
  for (const r of results) {
    const icon = r.ok ? '✅' : (r.required ? '❌' : '⚠️ ');
    console.log(`${icon} ${r.name}: ${r.message}`);
    if (!r.ok && r.required) failed++;
  }

  if (strict) {
    const csp = (merged['content-security-policy'] ?? '').toLowerCase();
    const strictChecks: Array<[boolean, string]> = [
      [/\bdefault-src\s+[^;]*'self'/.test(csp), "CSP must include default-src 'self'"],
      [!/\bscript-src\s+[^;]*'unsafe-inline'/.test(csp), "CSP script-src must not allow 'unsafe-inline'"],
      [/\bframe-ancestors\b/.test(csp), 'CSP must include frame-ancestors'],
    ];
    for (const [ok, msg] of strictChecks) {
      console.log(`${ok ? '✅' : '❌'} strict: ${msg}`);
      if (!ok) failed++;
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} required header check(s) failed.`);
    process.exit(1);
  }
  console.log(`\n✅ All required security headers present${strict ? ' (strict)' : ''}.`);
}

main();
