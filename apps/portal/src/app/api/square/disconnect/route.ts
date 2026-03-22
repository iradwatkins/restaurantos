import { NextResponse } from 'next/server';
import { getApiSession } from '@/lib/auth/api-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { getConvexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';

/**
 * Disconnect Square OAuth integration.
 *
 * Revokes the Square OAuth token and clears Square credentials
 * from the tenant record.
 *
 * Required env vars:
 * - SQUARE_APPLICATION_ID: Square app ID (for revoke API)
 * - SQUARE_APPLICATION_SECRET: Square app secret (for revoke API)
 * - SQUARE_ENVIRONMENT: 'sandbox' or 'production'
 */

function getSquareApiBaseUrl(): string {
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
  const rateLimit = checkRateLimit(`square-disconnect:${ip}`, {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const applicationId = process.env.SQUARE_APPLICATION_ID;
  const applicationSecret = process.env.SQUARE_APPLICATION_SECRET;

  // Fetch current tenant to get the access token for revocation
  const convex = getConvexClient();
  let tenant;
  try {
    tenant = await convex.query(api.tenants.queries.getById, {
      id: session.tenantId as Id<'tenants'>,
    });
  } catch (err) {
    logger.error({ err, tenantId: session.tenantId }, 'Failed to fetch tenant for Square disconnect');
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
  }

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // Attempt to revoke the Square OAuth token
  const accessToken = tenant.squareAccessToken;
  if (accessToken && applicationId && applicationSecret) {
    try {
      const baseUrl = getSquareApiBaseUrl();
      const revokeResponse = await fetch(`${baseUrl}/oauth2/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Client ${applicationSecret}`,
        },
        body: JSON.stringify({
          client_id: applicationId,
          access_token: accessToken,
        }),
      });

      if (!revokeResponse.ok) {
        const errorBody = await revokeResponse.text();
        logger.warn(
          { status: revokeResponse.status, body: errorBody, tenantId: session.tenantId },
          'Square token revocation returned non-OK status (proceeding with local cleanup)'
        );
      } else {
        logger.info(
          { tenantId: session.tenantId },
          'Square OAuth token revoked successfully'
        );
      }
    } catch (err) {
      // Log but don't block — always clear local credentials
      logger.warn(
        { err, tenantId: session.tenantId },
        'Square token revocation request failed (proceeding with local cleanup)'
      );
    }
  }

  // Clear Square credentials and set processor to none
  try {
    await convex.mutation(api.tenants.mutations.updatePaymentSettings, {
      tenantId: session.tenantId as Id<'tenants'>,
      paymentProcessor: 'none',
    });
  } catch (err) {
    logger.error({ err, tenantId: session.tenantId }, 'Failed to clear Square credentials');
    return NextResponse.json(
      { error: 'Failed to clear Square credentials' },
      { status: 500 }
    );
  }

  logger.info(
    { tenantId: session.tenantId, userId: session.userId },
    'Square integration disconnected'
  );

  return NextResponse.json({ success: true });
}
