import { NextResponse } from 'next/server';
import { verifyDoordashWebhookSignature, mapDoordashStatusToInternal } from '@/lib/doordash/webhook';
import { convexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import { logger } from '@/lib/logger';

/**
 * DoorDash Drive Webhook Endpoint
 *
 * Receives delivery status updates from DoorDash.
 * No session auth required — authenticates via webhook signature verification.
 *
 * DoorDash sends a JSON payload with:
 * - external_delivery_id: our delivery reference
 * - delivery_status: current status (created, confirmed, enroute_to_pickup, etc.)
 * - dasher_name, dasher_phone_number: driver info when assigned
 * - tracking_url: customer-facing tracking URL
 * - estimated pickup/dropoff times
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // Verify DoorDash webhook signature
    const webhookSecret = process.env.DOORDASH_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('DOORDASH_WEBHOOK_SECRET is not configured — rejecting webhook');
      return NextResponse.json(
        { error: 'Webhook signature verification is not configured' },
        { status: 500 }
      );
    }

    const signature = request.headers.get('x-doordash-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    if (!verifyDoordashWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);

    const externalDeliveryId = payload.external_delivery_id;
    const deliveryStatus = payload.delivery_status;

    if (!externalDeliveryId || !deliveryStatus) {
      return NextResponse.json(
        { error: 'Missing required fields: external_delivery_id, delivery_status' },
        { status: 400 }
      );
    }

    const internalStatus = mapDoordashStatusToInternal(deliveryStatus);

    // Update delivery record
    await convexClient.mutation(api.delivery.mutations.updateDeliveryStatus, {
      externalId: externalDeliveryId,
      status: internalStatus,
      driverName: payload.dasher_name,
      driverPhone: payload.dasher_phone_number,
      trackingUrl: payload.tracking_url,
      estimatedPickup: payload.pickup_time_estimated
        ? new Date(payload.pickup_time_estimated).getTime()
        : payload.estimated_pickup_time
          ? new Date(payload.estimated_pickup_time).getTime()
          : undefined,
      estimatedDropoff: payload.dropoff_time_estimated
        ? new Date(payload.dropoff_time_estimated).getTime()
        : payload.estimated_dropoff_time
          ? new Date(payload.estimated_dropoff_time).getTime()
          : undefined,
    });

    logger.info(
      {
        externalDeliveryId,
        doordashStatus: deliveryStatus,
        internalStatus,
      },
      'DoorDash webhook processed'
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    logger.error(
      { err: error instanceof Error ? error : undefined },
      'DoorDash webhook error'
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
