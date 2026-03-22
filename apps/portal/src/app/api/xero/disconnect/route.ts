import { NextResponse } from 'next/server';
import { getApiSession } from '@/lib/auth/api-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { getConvexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';

/**
 * Disconnect Xero OAuth integration.
 *
 * Revokes the Xero OAuth token and clears credentials
 * from the tenant record.
 *
 * Required env vars:
 * - XERO_CLIENT_ID: Xero app client ID
 * - XERO_CLIENT_SECRET: Xero app client secret
 */

export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`xero-disconnect:${ip}`, {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;

  // Fetch current tenant to get the access token for revocation
  const convex = getConvexClient();
  let tenant;
  try {
    tenant = await convex.query(api.tenants.queries.getById, {
      id: session.tenantId as Id<'tenants'>,
    });
  } catch (err) {
    logger.error({ err, tenantId: session.tenantId }, 'Failed to fetch tenant for Xero disconnect');
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
  }

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // Attempt to revoke the Xero OAuth token
  const refreshToken = tenant.xeroRefreshToken;
  if (refreshToken && clientId && clientSecret) {
    try {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const revokeResponse = await fetch(
        'https://identity.xero.com/connect/revocation',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
          body: new URLSearchParams({
            token: refreshToken,
          }).toString(),
        }
      );

      if (!revokeResponse.ok) {
        const errorBody = await revokeResponse.text();
        logger.warn(
          { status: revokeResponse.status, body: errorBody, tenantId: session.tenantId },
          'Xero token revocation returned non-OK status (proceeding with local cleanup)'
        );
      } else {
        logger.info(
          { tenantId: session.tenantId },
          'Xero OAuth token revoked successfully'
        );
      }
    } catch (err) {
      logger.warn(
        { err, tenantId: session.tenantId },
        'Xero token revocation request failed (proceeding with local cleanup)'
      );
    }
  }

  // Clear Xero credentials
  try {
    await convex.mutation(api.tenants.mutations.updateAccountingCredentials, {
      tenantId: session.tenantId as Id<'tenants'>,
      provider: 'none',
    });
  } catch (err) {
    logger.error({ err, tenantId: session.tenantId }, 'Failed to clear Xero credentials');
    return NextResponse.json(
      { error: 'Failed to clear Xero credentials' },
      { status: 500 }
    );
  }

  logger.info(
    { tenantId: session.tenantId, userId: session.userId },
    'Xero integration disconnected'
  );

  return NextResponse.json({ success: true });
}
