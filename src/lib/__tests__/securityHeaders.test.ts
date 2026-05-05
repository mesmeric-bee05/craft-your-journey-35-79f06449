import { describe, it, expect } from 'vitest';
import { diagnoseHeaders, SECURITY_HEADER_CHECKS } from '../securityHeaders';

describe('security headers diagnostics', () => {
  it('passes a fully hardened response', () => {
    const headers = {
      'content-security-policy':
        "default-src 'self'; script-src 'self'; frame-ancestors 'none'; object-src 'none'",
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-frame-options': 'DENY',
      'strict-transport-security': 'max-age=63072000; includeSubDomains',
    };
    const results = diagnoseHeaders(headers);
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it('flags missing CSP', () => {
    const results = diagnoseHeaders({});
    const csp = results.find((r) => r.name === 'content-security-policy');
    expect(csp?.ok).toBe(false);
    expect(csp?.required).toBe(true);
  });

  it('flags incomplete CSP directives', () => {
    const results = diagnoseHeaders({
      'content-security-policy': "default-src 'self'",
    });
    const csp = results.find((r) => r.name === 'content-security-policy');
    expect(csp?.ok).toBe(false);
    expect(csp?.message).toMatch(/missing directives/);
  });

  it('rejects invalid x-content-type-options', () => {
    const results = diagnoseHeaders({ 'x-content-type-options': 'sniff' });
    expect(results.find((r) => r.name === 'x-content-type-options')?.ok).toBe(false);
  });

  it('exposes 5 header checks', () => {
    expect(SECURITY_HEADER_CHECKS.length).toBe(5);
  });
});
