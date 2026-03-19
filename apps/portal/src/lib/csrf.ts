import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify that state-changing requests come from the same origin.
 * Uses the Origin header (set by browsers on all POST/PUT/DELETE requests).
 * Falls back to Referer header if Origin is missing.
 */
export function verifyCsrf(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();

  // Only check state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return null; // Safe method, no CSRF check needed
  }

  // Exempt webhook endpoints (they use signature verification instead)
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/api/webhooks/') || pathname.startsWith('/api/stripe/webhook')) {
    return null;
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  if (!host) {
    return NextResponse.json({ error: 'Missing host header' }, { status: 403 });
  }

  // Check Origin header first (most reliable)
  if (origin) {
    try {
      const originUrl = new URL(origin);
      // Allow if origin host matches request host (handles subdomains)
      if (
        originUrl.host === host ||
        host.endsWith('.' + originUrl.host) ||
        originUrl.host.endsWith('.' + host)
      ) {
        return null; // Same origin
      }
      // Also allow localhost variations in development
      if (originUrl.hostname === 'localhost' && host.includes('localhost')) {
        return null;
      }
    } catch {
      // Invalid origin URL
    }
    return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 });
  }

  // Fall back to Referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (
        refererUrl.host === host ||
        host.endsWith('.' + refererUrl.host) ||
        refererUrl.host.endsWith('.' + host)
      ) {
        return null;
      }
      if (refererUrl.hostname === 'localhost' && host.includes('localhost')) {
        return null;
      }
    } catch {
      // Invalid referer URL
    }
    return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 });
  }

  // No Origin or Referer header — block by default for state-changing requests
  // Some older browsers may not send these, but modern browsers always do
  return NextResponse.json({ error: 'CSRF check failed: missing origin' }, { status: 403 });
}
