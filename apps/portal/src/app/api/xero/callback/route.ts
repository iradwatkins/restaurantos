import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getConvexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';

/**
 * Xero OAuth2 callback handler.
 *
 * Handles the redirect from Xero after the merchant authorizes the app.
 * Exchanges the authorization code for access + refresh tokens, retrieves
 * the Xero tenant ID, and stores them on the tenant record via Convex.
 *
 * Required env vars:
 * - XERO_CLIENT_ID: Xero app client ID
 * - XERO_CLIENT_SECRET: Xero app client secret
 * - NEXT_PUBLIC_APP_URL: Base URL for redirects
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const settingsUrl = `${appUrl}/settings`;

  // Handle OAuth errors
  if (error) {
    logger.warn({ error }, 'Xero OAuth authorization denied');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('xero_error', error);
    return NextResponse.redirect(redirectUrl.toString());
  }

  if (!code || !state) {
    logger.warn('Xero OAuth callback missing code or state');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('xero_error', 'Missing authorization code');
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
    logger.error({ err }, 'Xero OAuth invalid state parameter');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('xero_error', 'Invalid or expired authorization state');
    return NextResponse.redirect(redirectUrl.toString());
  }

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logger.error('Xero OAuth credentials not configured');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('xero_error', 'Xero integration not configured');
    return NextResponse.redirect(redirectUrl.toString());
  }

  const callbackUrl = `${appUrl}/api/xero/callback`;

  // Exchange authorization code for access token
  let tokenData: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await fetch(
      'https://identity.xero.com/connect/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: callbackUrl,
        }).toString(),
      }
    );

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorBody}`);
    }

    tokenData = await tokenResponse.json();
  } catch (err) {
    logger.error({ err }, 'Xero OAuth token exchange failed');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('xero_error', 'Failed to connect Xero account');
    return NextResponse.redirect(redirectUrl.toString());
  }

  if (!tokenData.access_token) {
    logger.error('Xero OAuth token response missing access_token');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('xero_error', 'Xero did not return an access token');
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Retrieve the Xero tenant ID (organisation)
  let xeroTenantId: string | undefined;
  try {
    const connectionsResponse = await fetch(
      'https://api.xero.com/connections',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (connectionsResponse.ok) {
      const connections = await connectionsResponse.json();
      if (Array.isArray(connections) && connections.length > 0) {
        xeroTenantId = connections[0].tenantId;
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to fetch Xero connections, proceeding without xeroTenantId');
  }

  // Store tokens on the tenant
  try {
    const convex = getConvexClient();
    await convex.mutation(api.tenants.mutations.updateAccountingCredentials, {
      tenantId: tenantId as Id<'tenants'>,
      provider: 'xero',
      xeroAccessToken: tokenData.access_token,
      xeroRefreshToken: tokenData.refresh_token,
      xeroTenantId,
    });
  } catch (err) {
    logger.error({ err, tenantId }, 'Failed to store Xero credentials on tenant');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('xero_error', 'Failed to save Xero credentials');
    return NextResponse.redirect(redirectUrl.toString());
  }

  logger.info(
    { tenantId, xeroTenantId },
    'Xero OAuth connection completed'
  );

  const redirectUrl = new URL(settingsUrl);
  redirectUrl.searchParams.set('xero_success', 'true');
  return NextResponse.redirect(redirectUrl.toString());
}
