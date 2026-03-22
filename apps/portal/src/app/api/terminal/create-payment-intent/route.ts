import { NextResponse } from 'next/server';
import { StripeTerminalProvider } from '@restaurantos/payment-provider';
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
  const rateLimit = checkRateLimit(`terminal-pi:${ip}`, {
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

  let body: { amount?: number; orderId?: string; tenantId?: string; currency?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { amount, orderId, tenantId, currency } = body;

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

  // Validate tenantId matches the authenticated session to prevent cross-tenant charges
  const effectiveTenantId = tenantId || session.tenantId;
  if (effectiveTenantId !== session.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const provider = new StripeTerminalProvider({
      secretKey: stripeSecretKey,
    });

    const metadata: Record<string, string> = {
      tenantId: session.tenantId,
      source: 'terminal',
    };
    if (orderId) {
      metadata.orderId = orderId;
    }

    const result = await provider.createPaymentIntent({
      amount,
      currency: currency || 'usd',
      metadata,
    });

    logger.info(
      {
        tenantId: session.tenantId,
        userId: session.userId,
        paymentIntentId: result.paymentIntentId,
        amount,
        orderId,
      },
      'Terminal payment intent created'
    );

    return NextResponse.json({
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create payment intent';
    logger.error(
      { err: err instanceof Error ? err : undefined, tenantId: session.tenantId, amount, orderId },
      'Terminal payment intent error'
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
