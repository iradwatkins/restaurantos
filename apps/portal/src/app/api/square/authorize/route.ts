import { NextResponse } from 'next/server';
import { getApiSession } from '@/lib/auth/api-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * Square OAuth2 authorization URL generator.
 *
 * Generates the Square OAuth2 authorization URL with CSRF state protection.
 * The user is redirected to Square to grant permissions, then Square redirects
 * back to /api/square/callback with an authorization code.
 *
 * Required env vars:
 * - SQUARE_APPLICATION_ID: Square app ID
 * - SQUARE_ENVIRONMENT: 'sandbox' or 'production'
 * - NEXT_PUBLIC_APP_URL: Base URL for OAuth callback
 */

const SQUARE_SCOPES = [
  'PAYMENTS_WRITE',
  'PAYMENTS_READ',
  'DEVICE_CREDENTIAL_MANAGEMENT',
  'DEVICES_READ',
  'ORDERS_WRITE',
].join('+');

function getSquareOAuthBaseUrl(): string {
  const env = process.env.SQUARE_ENVIRONMENT || 'sandbox';
  return env === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`square-auth:${ip}`, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const applicationId = process.env.SQUARE_APPLICATION_ID;
  if (!applicationId) {
    return NextResponse.json(
      { error: 'Square integration is not configured' },
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

  // Build CSRF state: encode tenant ID so callback can associate tokens
  // with the correct tenant. In production, this should also include a
  // cryptographic nonce stored server-side for full CSRF protection.
  const state = Buffer.from(
    JSON.stringify({
      tenantId: session.tenantId,
      userId: session.userId,
      ts: Date.now(),
    })
  ).toString('base64url');

  const callbackUrl = `${appUrl}/api/square/callback`;

  const baseUrl = getSquareOAuthBaseUrl();
  const authorizationUrl =
    `${baseUrl}/oauth2/authorize` +
    `?client_id=${applicationId}` +
    `&scope=${SQUARE_SCOPES}` +
    `&session=false` +
    `&state=${state}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}`;

  logger.info(
    { tenantId: session.tenantId, userId: session.userId },
    'Square OAuth authorization URL generated'
  );

  return NextResponse.json({ authorizationUrl });
}
