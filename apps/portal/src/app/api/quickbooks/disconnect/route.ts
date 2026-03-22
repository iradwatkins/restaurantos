import { NextResponse } from 'next/server';
import { getApiSession } from '@/lib/auth/api-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { getConvexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';

/**
 * Disconnect QuickBooks OAuth integration.
 *
 * Revokes the QuickBooks OAuth token and clears credentials
 * from the tenant record.
 *
 * Required env vars:
 * - QUICKBOOKS_CLIENT_ID: QuickBooks app client ID
 * - QUICKBOOKS_CLIENT_SECRET: QuickBooks app client secret
 */

export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`quickbooks-disconnect:${ip}`, {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

  // Fetch current tenant to get the access token for revocation
  const convex = getConvexClient();
  let tenant;
  try {
    tenant = await convex.query(api.tenants.queries.getById, {
      id: session.tenantId as Id<'tenants'>,
    });
  } catch (err) {
    logger.error({ err, tenantId: session.tenantId }, 'Failed to fetch tenant for QuickBooks disconnect');
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
  }

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // Attempt to revoke the QuickBooks OAuth token
  const accessToken = tenant.quickbooksAccessToken;
  if (accessToken && clientId && clientSecret) {
    try {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const revokeResponse = await fetch(
        'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${basicAuth}`,
          },
          body: JSON.stringify({
            token: accessToken,
          }),
        }
      );

      if (!revokeResponse.ok) {
        const errorBody = await revokeResponse.text();
        logger.warn(
          { status: revokeResponse.status, body: errorBody, tenantId: session.tenantId },
          'QuickBooks token revocation returned non-OK status (proceeding with local cleanup)'
        );
      } else {
        logger.info(
          { tenantId: session.tenantId },
          'QuickBooks OAuth token revoked successfully'
        );
      }
    } catch (err) {
      logger.warn(
        { err, tenantId: session.tenantId },
        'QuickBooks token revocation request failed (proceeding with local cleanup)'
      );
    }
  }

  // Clear QuickBooks credentials
  try {
    await convex.mutation(api.tenants.mutations.updateAccountingCredentials, {
      tenantId: session.tenantId as Id<'tenants'>,
      provider: 'none',
    });
  } catch (err) {
    logger.error({ err, tenantId: session.tenantId }, 'Failed to clear QuickBooks credentials');
    return NextResponse.json(
      { error: 'Failed to clear QuickBooks credentials' },
      { status: 500 }
    );
  }

  logger.info(
    { tenantId: session.tenantId, userId: session.userId },
    'QuickBooks integration disconnected'
  );

  return NextResponse.json({ success: true });
}
