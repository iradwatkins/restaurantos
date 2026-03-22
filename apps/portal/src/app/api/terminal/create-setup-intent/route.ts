import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getApiSession } from '@/lib/auth/api-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`terminal-si:${ip}`, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: 'Payment processing is not configured' },
      { status: 503 }
    );
  }

  let body: { tenantId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate tenantId matches the authenticated session to prevent cross-tenant access
  const effectiveTenantId = body.tenantId || session.tenantId;
  if (effectiveTenantId !== session.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const stripe = new Stripe(stripeSecretKey);

    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['card_present'],
      metadata: {
        tenantId: session.tenantId,
        source: 'tab_hold',
      },
    });

    logger.info(
      {
        tenantId: session.tenantId,
        userId: session.userId,
        setupIntentId: setupIntent.id,
      },
      'Terminal setup intent created for tab hold'
    );

    return NextResponse.json({
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to create setup intent';
    logger.error(
      {
        err: err instanceof Error ? err : undefined,
        tenantId: session.tenantId,
      },
      'Terminal setup intent error'
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
