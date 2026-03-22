import { NextResponse } from 'next/server';
import { getApiSession } from '@/lib/auth/api-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * Xero OAuth2 authorization URL generator.
 *
 * Generates the Xero OAuth2 authorization URL with CSRF state protection.
 * The user is redirected to Xero to grant permissions, then Xero redirects
 * back to /api/xero/callback with an authorization code.
 *
 * Required env vars:
 * - XERO_CLIENT_ID: Xero app client ID
 * - NEXT_PUBLIC_APP_URL: Base URL for OAuth callback
 */

const XERO_SCOPES = 'openid profile email accounting.transactions offline_access';

export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`xero-auth:${ip}`, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const clientId = process.env.XERO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'Xero integration is not configured' },
      { status: 503 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json(
      { error: 'Application URL is not configured' },
      { status: 503 }
    );
  }

  // Build CSRF state: encode tenant ID for callback association
  const state = Buffer.from(
    JSON.stringify({
      tenantId: session.tenantId,
      userId: session.userId,
      ts: Date.now(),
    })
  ).toString('base64url');

  const callbackUrl = `${appUrl}/api/xero/callback`;

  const authorizationUrl =
    `https://login.xero.com/identity/connect/authorize` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
    `&scope=${encodeURIComponent(XERO_SCOPES)}` +
    `&state=${state}`;

  logger.info(
    { tenantId: session.tenantId, userId: session.userId },
    'Xero OAuth authorization URL generated'
  );

  return NextResponse.json({ authorizationUrl });
}
