import { NextResponse } from 'next/server';
import { SquareTerminalProvider } from '@restaurantos/payment-provider';
import { getApiSession } from '@/lib/auth/api-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { getConvexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';

/**
 * Check Square Terminal checkout status.
 *
 * Polls the current status of a Square Terminal checkout.
 * Returns: status (pending, in_progress, completed, canceled, cancel_requested)
 */
export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`square-status:${ip}`, {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: { checkoutId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { checkoutId } = body;

  if (!checkoutId || typeof checkoutId !== 'string') {
    return NextResponse.json(
      { error: 'checkoutId is required' },
      { status: 400 }
    );
  }

  // Fetch tenant to get Square credentials
  const convex = getConvexClient();
  let tenant;
  try {
    tenant = await convex.query(api.tenants.queries.getById, {
      id: session.tenantId as Id<'tenants'>,
    });
  } catch (err) {
    logger.error({ err, tenantId: session.tenantId }, 'Failed to fetch tenant for Square status');
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
  }

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  if (!tenant.squareAccessToken || !tenant.squareLocationId) {
    return NextResponse.json(
      { error: 'Square credentials are not configured' },
      { status: 503 }
    );
  }

  const environment = (process.env.SQUARE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';

  try {
    const provider = new SquareTerminalProvider({
      accessToken: tenant.squareAccessToken,
      locationId: tenant.squareLocationId,
      environment,
    });

    // capturePayment on Square provider performs a status check
    const result = await provider.capturePayment(checkoutId);

    logger.info(
      {
        tenantId: session.tenantId,
        checkoutId,
        status: result.status,
      },
      'Square Terminal checkout status checked'
    );

    return NextResponse.json({ status: result.status });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to check checkout status';
    logger.error(
      {
        err: err instanceof Error ? err : undefined,
        tenantId: session.tenantId,
        checkoutId,
      },
      'Square Terminal status check error'
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
