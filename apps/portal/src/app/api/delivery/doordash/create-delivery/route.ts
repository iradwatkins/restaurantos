import { NextResponse } from 'next/server';
import { getApiSession } from '@/lib/auth/api-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { DoordashDriveClient } from '@/lib/doordash/client';
import { convexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`doordash-create:${ip}`, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { orderId, pickupAddress, dropoffAddress, pickupTime } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );
    }

    if (!pickupAddress || !dropoffAddress) {
      return NextResponse.json(
        { error: 'pickupAddress and dropoffAddress are required' },
        { status: 400 }
      );
    }

    // Fetch tenant to get DoorDash credentials (stored on tenant document)
    const tenant = await convexClient.query(api.tenants.queries.getById, {
      id: session.tenantId as any,
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (!tenant.doordashDeveloperId || !tenant.doordashKeyId || !tenant.doordashSigningSecret) {
      return NextResponse.json(
        { error: 'DoorDash Drive is not configured for this restaurant' },
        { status: 400 }
      );
    }

    if (!tenant.doordashDriveEnabled) {
      return NextResponse.json(
        { error: 'DoorDash Drive is disabled for this restaurant' },
        { status: 400 }
      );
    }

    // Verify the order belongs to this tenant
    const order = await convexClient.query(api.orders.queries.getById, {
      id: orderId,
    });

    if (!order || order.tenantId !== tenant._id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const client = new DoordashDriveClient({
      developerId: tenant.doordashDeveloperId,
      keyId: tenant.doordashKeyId,
      signingSecret: tenant.doordashSigningSecret,
    });

    const externalDeliveryId = `ros_${tenant._id}_${orderId}_${Date.now()}`;

    const delivery = await client.createDelivery({
      externalDeliveryId,
      pickupAddress: {
        street: pickupAddress.street,
        city: pickupAddress.city,
        state: pickupAddress.state,
        zipCode: pickupAddress.zipCode || pickupAddress.zip,
      },
      pickupPhoneNumber: tenant.phone || '+10000000000',
      pickupBusinessName: tenant.name,
      dropoffAddress: {
        street: dropoffAddress.street,
        city: dropoffAddress.city,
        state: dropoffAddress.state,
        zipCode: dropoffAddress.zipCode || dropoffAddress.zip,
      },
      dropoffPhoneNumber: order.customerPhone || '+10000000000',
      dropoffContactGivenName: order.customerName,
      dropoffInstructions: order.deliveryInstructions,
      pickupTime,
      orderValue: order.total,
    });

    // Create delivery record in Convex (also syncs order.deliveryStatus)
    await convexClient.mutation(api.delivery.mutations.createDeliveryRequest, {
      tenantId: tenant._id,
      orderId,
      provider: 'doordash',
      externalId: delivery.external_delivery_id,
      status: 'pending',
      fee: delivery.fee,
      trackingUrl: delivery.tracking_url,
      estimatedPickup: delivery.pickup_time_estimated
        ? new Date(delivery.pickup_time_estimated).getTime()
        : delivery.estimated_pickup_time
          ? new Date(delivery.estimated_pickup_time).getTime()
          : undefined,
      estimatedDropoff: delivery.dropoff_time_estimated
        ? new Date(delivery.dropoff_time_estimated).getTime()
        : delivery.estimated_dropoff_time
          ? new Date(delivery.estimated_dropoff_time).getTime()
          : undefined,
    });

    logger.info(
      {
        tenantId: session.tenantId,
        orderId,
        externalDeliveryId: delivery.external_delivery_id,
      },
      'DoorDash Drive delivery created'
    );

    return NextResponse.json({
      deliveryId: delivery.external_delivery_id,
      estimatedPickupTime: delivery.pickup_time_estimated || delivery.estimated_pickup_time,
      estimatedDropoffTime: delivery.dropoff_time_estimated || delivery.estimated_dropoff_time,
      fee: delivery.fee,
      trackingUrl: delivery.tracking_url,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create delivery';
    logger.error(
      { err: err instanceof Error ? err : undefined, tenantId: session.tenantId },
      'DoorDash create delivery error'
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
