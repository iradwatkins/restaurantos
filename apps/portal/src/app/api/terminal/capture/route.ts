import { NextResponse } from 'next/server';
import { StripeTerminalProvider } from '@restaurantos/payment-provider';
import { getApiSession } from '@/lib/auth/api-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`terminal-capture:${ip}`, {
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

  let body: { paymentIntentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { paymentIntentId } = body;

  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    return NextResponse.json(
      { error: 'paymentIntentId is required' },
      { status: 400 }
    );
  }

  try {
    const provider = new StripeTerminalProvider({
      secretKey: stripeSecretKey,
    });

    const result = await provider.capturePayment(paymentIntentId);

    logger.info(
      {
        tenantId: session.tenantId,
        userId: session.userId,
        paymentIntentId,
        status: result.status,
      },
      'Terminal payment captured'
    );

    return NextResponse.json({ status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to capture payment';
    logger.error(
      { err: err instanceof Error ? err : undefined, tenantId: session.tenantId, paymentIntentId },
      'Terminal capture error'
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
