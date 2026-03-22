import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const MAX_AMOUNT = 1000000; // $10,000 in cents

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 503 }
    );
  }

  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(ip, { maxRequests: 20, windowMs: 60_000 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey);

    const { amount, currency, metadata } = await request.json();

    if (!metadata || !metadata.tenantId) {
      return NextResponse.json(
        { error: 'metadata.tenantId is required' },
        { status: 400 }
      );
    }

    if (!amount || amount < 50) {
      return NextResponse.json(
        { error: 'Amount must be at least $0.50' },
        { status: 400 }
      );
    }

    if (amount > MAX_AMOUNT) {
      return NextResponse.json(
        { error: 'Amount cannot exceed $10,000' },
        { status: 400 }
      );
    }

    // Server-side amount verification when orderId is provided
    let verifiedAmount = amount;
    if (metadata.orderId) {
      try {
        const { ConvexHttpClient } = await import('convex/browser');
        const { api } = await import('@restaurantos/backend');
        const convex = new ConvexHttpClient(
          process.env.NEXT_PUBLIC_CONVEX_URL!
        );
        const order = await convex.query(api.orders.queries.getById, {
          id: metadata.orderId,
        });
        if (order && order.total) {
          verifiedAmount = order.total;
        }
      } catch (err) {
        logger.error({ err }, 'Order verification failed');
        return NextResponse.json(
          { error: 'Failed to verify order amount' },
          { status: 500 }
        );
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: verifiedAmount,
      currency: currency || 'usd',
      metadata: metadata || {},
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err: any) {
    logger.error({ err }, 'Stripe error');
    return NextResponse.json(
      { error: err.message || 'Payment failed' },
      { status: 500 }
    );
  }
}
