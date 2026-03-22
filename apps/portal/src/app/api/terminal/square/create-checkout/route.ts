import { NextResponse } from 'next/server';
import { SquareTerminalProvider } from '@restaurantos/payment-provider';
import { getApiSession } from '@/lib/auth/api-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { getConvexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';

const MAX_AMOUNT = 1_000_000; // $10,000 in cents

/**
 * Create a Square Terminal checkout.
 *
 * This route creates a terminal checkout on Square that a connected
 * Square Terminal device will pick up and display to the customer.
 *
 * Accepts: amount (cents), orderId (optional), deviceId (required)
 * Returns: checkoutId
 */
export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`square-checkout:${ip}`, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: {
    amount?: number;
    orderId?: string;
    deviceId?: string;
    currency?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { amount, orderId, deviceId, currency } = body;

  if (!amount || typeof amount !== 'number' || amount < 100) {
    return NextResponse.json(
      { error: 'Amount must be at least 100 cents ($1.00)' },
      { status: 400 }
    );
  }

  if (amount > MAX_AMOUNT) {
    return NextResponse.json(
      { error: 'Amount cannot exceed $10,000' },
      { status: 400 }
    );
  }

  if (!deviceId || typeof deviceId !== 'string') {
    return NextResponse.json(
      { error: 'deviceId is required to target a Square Terminal device' },
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
    logger.error({ err, tenantId: session.tenantId }, 'Failed to fetch tenant for Square checkout');
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
  }

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  if (tenant.paymentProcessor !== 'square') {
    return NextResponse.json(
      { error: 'Square is not configured as the payment processor' },
      { status: 400 }
    );
  }

  if (!tenant.squareAccessToken || !tenant.squareLocationId) {
    return NextResponse.json(
      { error: 'Square credentials are not configured. Connect Square in Settings.' },
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

    const metadata: Record<string, string> = {
      tenantId: session.tenantId,
      source: 'terminal',
      deviceId,
    };
    if (orderId) {
      metadata.orderId = orderId;
    }

    const result = await provider.createPaymentIntent({
      amount,
      currency: currency || 'USD',
      metadata,
    });

    logger.info(
      {
        tenantId: session.tenantId,
        userId: session.userId,
        checkoutId: result.paymentIntentId,
        amount,
        orderId,
        deviceId,
      },
      'Square Terminal checkout created'
    );

    return NextResponse.json({
      checkoutId: result.paymentIntentId,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to create Square Terminal checkout';
    logger.error(
      {
        err: err instanceof Error ? err : undefined,
        tenantId: session.tenantId,
        amount,
        orderId,
        deviceId,
      },
      'Square Terminal checkout error'
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
