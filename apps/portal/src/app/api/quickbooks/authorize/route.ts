import { NextResponse } from 'next/server';
import { getApiSession } from '@/lib/auth/api-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * QuickBooks OAuth2 authorization URL generator.
 *
 * Generates the QuickBooks OAuth2 authorization URL with CSRF state protection.
 * The user is redirected to QuickBooks to grant permissions, then QuickBooks
 * redirects back to /api/quickbooks/callback with an authorization code.
 *
 * Required env vars:
 * - QUICKBOOKS_CLIENT_ID: QuickBooks app client ID
 * - QUICKBOOKS_ENVIRONMENT: 'sandbox' or 'production'
 * - NEXT_PUBLIC_APP_URL: Base URL for OAuth callback
 */

const QUICKBOOKS_SCOPES = 'com.intuit.quickbooks.accounting';

function getQuickBooksOAuthBaseUrl(): string {
  return 'https://appcenter.intuit.com/connect/oauth2';
}

export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`quickbooks-auth:${ip}`, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'QuickBooks integration is not configured' },
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

  const callbackUrl = `${appUrl}/api/quickbooks/callback`;

  const authorizationUrl =
    `${getQuickBooksOAuthBaseUrl()}` +
    `?client_id=${clientId}` +
    `&scope=${encodeURIComponent(QUICKBOOKS_SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
    `&response_type=code` +
    `&state=${state}`;

  logger.info(
    { tenantId: session.tenantId, userId: session.userId },
    'QuickBooks OAuth authorization URL generated'
  );

  return NextResponse.json({ authorizationUrl });
}
