import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getConvexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';

/**
 * QuickBooks OAuth2 callback handler.
 *
 * Handles the redirect from QuickBooks after the merchant authorizes the app.
 * Exchanges the authorization code for access + refresh tokens and stores
 * them on the tenant record via Convex.
 *
 * Required env vars:
 * - QUICKBOOKS_CLIENT_ID: QuickBooks app client ID
 * - QUICKBOOKS_CLIENT_SECRET: QuickBooks app client secret
 * - QUICKBOOKS_ENVIRONMENT: 'sandbox' or 'production'
 * - NEXT_PUBLIC_APP_URL: Base URL for redirects
 */

function getQuickBooksTokenUrl(): string {
  return 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const realmId = url.searchParams.get('realmId');
  const error = url.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const settingsUrl = `${appUrl}/settings`;

  // Handle OAuth errors
  if (error) {
    logger.warn({ error }, 'QuickBooks OAuth authorization denied');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('quickbooks_error', error);
    return NextResponse.redirect(redirectUrl.toString());
  }

  if (!code || !state) {
    logger.warn('QuickBooks OAuth callback missing code or state');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('quickbooks_error', 'Missing authorization code');
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
    logger.error({ err }, 'QuickBooks OAuth invalid state parameter');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('quickbooks_error', 'Invalid or expired authorization state');
    return NextResponse.redirect(redirectUrl.toString());
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logger.error('QuickBooks OAuth credentials not configured');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('quickbooks_error', 'QuickBooks integration not configured');
    return NextResponse.redirect(redirectUrl.toString());
  }

  const callbackUrl = `${appUrl}/api/quickbooks/callback`;

  // Exchange authorization code for access token
  let tokenData: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await fetch(getQuickBooksTokenUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorBody}`);
    }

    tokenData = await tokenResponse.json();
  } catch (err) {
    logger.error({ err }, 'QuickBooks OAuth token exchange failed');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('quickbooks_error', 'Failed to connect QuickBooks account');
    return NextResponse.redirect(redirectUrl.toString());
  }

  if (!tokenData.access_token) {
    logger.error('QuickBooks OAuth token response missing access_token');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('quickbooks_error', 'QuickBooks did not return an access token');
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Store tokens on the tenant
  try {
    const convex = getConvexClient();
    await convex.mutation(api.tenants.mutations.updateAccountingCredentials, {
      tenantId: tenantId as Id<'tenants'>,
      provider: 'quickbooks',
      quickbooksAccessToken: tokenData.access_token,
      quickbooksRefreshToken: tokenData.refresh_token,
      quickbooksRealmId: realmId ?? undefined,
    });
  } catch (err) {
    logger.error({ err, tenantId }, 'Failed to store QuickBooks credentials on tenant');
    const redirectUrl = new URL(settingsUrl);
    redirectUrl.searchParams.set('quickbooks_error', 'Failed to save QuickBooks credentials');
    return NextResponse.redirect(redirectUrl.toString());
  }

  logger.info(
    { tenantId, realmId },
    'QuickBooks OAuth connection completed'
  );

  const redirectUrl = new URL(settingsUrl);
  redirectUrl.searchParams.set('quickbooks_success', 'true');
  return NextResponse.redirect(redirectUrl.toString());
}
