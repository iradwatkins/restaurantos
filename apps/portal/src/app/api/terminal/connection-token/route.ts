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
  const rateLimit = checkRateLimit(`terminal-token:${ip}`, {
    maxRequests: 30,
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

  try {
    const provider = new StripeTerminalProvider({
      secretKey: stripeSecretKey,
    });

    const token = await provider.createConnectionToken();

    logger.info(
      { tenantId: session.tenantId, userId: session.userId },
      'Terminal connection token created'
    );

    return NextResponse.json({ secret: token.secret });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create connection token';
    logger.error(
      { err: err instanceof Error ? err : undefined, tenantId: session.tenantId },
      'Terminal connection token error'
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
