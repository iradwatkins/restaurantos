import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getConvexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';

/**
 * Square OAuth2 callback handler.
 *
 * Handles the redirect from Square after the merchant authorizes the app.
 * Exchanges the authorization code for access + refresh tokens and stores
 * them on the tenant record via Convex.
 *
 * This is a public route (no session cookie required) because Square
 * redirects the browser here directly.
 *
 * Required env vars:
 * - SQUARE_APPLICATION_ID: Square app ID
 * - SQUARE_APPLICATION_SECRET: Square app secret
 * - SQUARE_ENVIRONMENT: 'sandbox' or 'production'
 * - NEXT_PUBLIC_APP_URL: Base URL for redirects
 */

function getSquareApiBaseUrl(): string {
  const env = process.env.SQUARE_ENVIRONMENT || 'sandbox';
  return env === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const settingsUrl = `${appUrl}/settings`;

  // Handle OAuth errors (user denied access, etc.)
  if (error) {
    logger.warn({ error, errorDescription }, 'Square OAuth authorization denied');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('square_error', errorDescription || error);
    return NextResponse.redirect(redirectUrl.toString());
  }

  if (!code || !state) {
    logger.warn('Square OAuth callback missing code or state');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('square_error', 'Missing authorization code');
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Decode state to get tenant ID
  let tenantId: string;
  try {
    const decoded = JSON.parse(
      Buffer.from(state, 'base64url').toString('utf-8')
    );
    tenantId = decoded.tenantId;

    // Reject stale state tokens (older than 10 minutes)
    if (Date.now() - decoded.ts > 10 * 60 * 1000) {
      throw new Error('State token expired');
    }
  } catch (err) {
    logger.error({ err }, 'Square OAuth invalid state parameter');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('square_error', 'Invalid or expired authorization state');
    return NextResponse.redirect(redirectUrl.toString());
  }

  const applicationId = process.env.SQUARE_APPLICATION_ID;
  const applicationSecret = process.env.SQUARE_APPLICATION_SECRET;

  if (!applicationId || !applicationSecret) {
    logger.error('Square OAuth credentials not configured');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('square_error', 'Square integration not configured');
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Exchange authorization code for access token
  const baseUrl = getSquareApiBaseUrl();
  let tokenData: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: string;
    merchant_id?: string;
  };

  try {
    const tokenResponse = await fetch(`${baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: applicationId,
        client_secret: applicationSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorBody}`);
    }

    tokenData = await tokenResponse.json();
  } catch (err) {
    logger.error({ err }, 'Square OAuth token exchange failed');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('square_error', 'Failed to connect Square account');
    return NextResponse.redirect(redirectUrl.toString());
  }

  if (!tokenData.access_token) {
    logger.error('Square OAuth token response missing access_token');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('square_error', 'Square did not return an access token');
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Retrieve the merchant's primary location
  let locationId: string | undefined;
  try {
    const locationsResponse = await fetch(`${baseUrl}/v2/locations`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (locationsResponse.ok) {
      const locationsData = await locationsResponse.json();
      const locations = locationsData.locations ?? [];
      // Use the first active location, or the first location
      const activeLocation = locations.find(
        (l: { status?: string }) => l.status === 'ACTIVE'
      );
      locationId = activeLocation?.id ?? locations[0]?.id;
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to fetch Square locations, proceeding without locationId');
  }

  // Store tokens on the tenant
  try {
    const convex = getConvexClient();
    await convex.mutation(api.tenants.mutations.updatePaymentSettings, {
      tenantId: tenantId as Id<'tenants'>,
      paymentProcessor: 'square',
      squareAccessToken: tokenData.access_token,
      squareRefreshToken: tokenData.refresh_token,
      squareLocationId: locationId,
      squareMerchantId: tokenData.merchant_id,
    });
  } catch (err) {
    logger.error({ err, tenantId }, 'Failed to store Square credentials on tenant');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('square_error', 'Failed to save Square credentials');
    return NextResponse.redirect(redirectUrl.toString());
  }

  logger.info(
    {
      tenantId,
      merchantId: tokenData.merchant_id,
      locationId,
    },
    'Square OAuth connection completed'
  );

  const redirectUrl = new URL(settingsUrl);
  redirectUrl.searchParams.set('square_success', 'true');
  return NextResponse.redirect(redirectUrl.toString());
}
