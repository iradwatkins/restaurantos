import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@restaurantos/backend';
import type { Id, TableNames } from '@restaurantos/backend/dataModel';
import { logger } from '@/lib/logger';

function asConvexId<T extends TableNames>(value: string | undefined, table: T): Id<T> {
  if (!value) throw new Error(`Missing ${table} ID in Stripe metadata`);
  return value as Id<T>;
}

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(stripeSecretKey);

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err : undefined }, 'Webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const { orderId, tenantId } = paymentIntent.metadata || {};

        if (orderId && tenantId) {
          await convexClient.mutation(api.orders.mutations.recordPayment, {
            tenantId: asConvexId(tenantId, "tenants"),
            orderId: asConvexId(orderId, "orders"),
            amount: paymentIntent.amount,
            method: 'card',
            stripePaymentIntentId: paymentIntent.id,
            stripeChargeId: paymentIntent.latest_charge as string | undefined,
          });
          logger.info({ orderId, tenantId, paymentIntentId: paymentIntent.id }, 'Payment recorded via Stripe webhook');
        } else {
          logger.warn({ paymentIntentId: paymentIntent.id }, 'Payment succeeded without order metadata');
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const { orderId } = paymentIntent.metadata || {};
        logger.error({ paymentIntentId: paymentIntent.id, orderId, errorMessage: paymentIntent.last_payment_error?.message }, 'Payment failed');
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId = charge.payment_intent as string | null;
        if (paymentIntentId) {
          logger.info({ paymentIntentId, amountRefunded: charge.amount_refunded }, 'Charge refunded');
          // Payment status will be updated via the payments table lookup
        }
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object;
        logger.error({ disputeId: dispute.id, amount: dispute.amount, reason: dispute.reason }, 'Dispute created');
        break;
      }

      default:
        // Unhandled event type — log but don't fail
        break;
    }
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err : undefined, eventType: event.type }, 'Error processing webhook event');
    // Return 200 to prevent Stripe retries for processing errors
    // The event was received successfully, we just failed to process it
  }

  return NextResponse.json({ received: true });
}
