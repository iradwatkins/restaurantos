import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getApiSession } from '@/lib/auth/api-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const MAX_AMOUNT = 1_000_000; // $10,000 in cents

export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`terminal-charge:${ip}`, {
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

  let body: {
    paymentMethodId?: string;
    amount?: number;
    tenantId?: string;
    orderId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { paymentMethodId, amount, orderId } = body;

  if (!paymentMethodId || typeof paymentMethodId !== 'string') {
    return NextResponse.json(
      { error: 'paymentMethodId is required' },
      { status: 400 }
    );
  }

  if (!amount || typeof amount !== 'number' || amount < 50) {
    return NextResponse.json(
      { error: 'Amount must be at least 50 cents ($0.50)' },
      { status: 400 }
    );
  }

  if (amount > MAX_AMOUNT) {
    return NextResponse.json(
      { error: 'Amount cannot exceed $10,000' },
      { status: 400 }
    );
  }

  if (!orderId || typeof orderId !== 'string') {
    return NextResponse.json(
      { error: 'orderId is required' },
      { status: 400 }
    );
  }

  // Validate tenantId matches the authenticated session
  const effectiveTenantId = body.tenantId || session.tenantId;
  if (effectiveTenantId !== session.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const stripe = new Stripe(stripeSecretKey);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      metadata: {
        tenantId: session.tenantId,
        orderId,
        source: 'tab_close',
      },
    });

    logger.info(
      {
        tenantId: session.tenantId,
        userId: session.userId,
        paymentIntentId: paymentIntent.id,
        paymentMethodId,
        amount,
        orderId,
        status: paymentIntent.status,
      },
      'Tab held card charged'
    );

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to charge held card';
    logger.error(
      {
        err: err instanceof Error ? err : undefined,
        tenantId: session.tenantId,
        paymentMethodId,
        amount,
        orderId,
      },
      'Tab charge held card error'
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
