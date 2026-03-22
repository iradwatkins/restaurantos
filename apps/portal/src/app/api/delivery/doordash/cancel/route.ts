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
  const rateLimit = checkRateLimit(`doordash-cancel:${ip}`, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { deliveryId } = body;

    if (!deliveryId) {
      return NextResponse.json(
        { error: 'deliveryId is required' },
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

    const client = new DoordashDriveClient({
      developerId: tenant.doordashDeveloperId,
      keyId: tenant.doordashKeyId,
      signingSecret: tenant.doordashSigningSecret,
    });

    const delivery = await client.cancelDelivery(deliveryId);

    // Update delivery record in Convex (also syncs order.deliveryStatus)
    await convexClient.mutation(api.delivery.mutations.updateDeliveryStatus, {
      externalId: deliveryId,
      status: 'cancelled',
    });

    logger.info(
      { tenantId: session.tenantId, deliveryId },
      'DoorDash Drive delivery cancelled'
    );

    return NextResponse.json({
      deliveryId: delivery.external_delivery_id,
      status: delivery.delivery_status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel delivery';
    logger.error(
      { err: err instanceof Error ? err : undefined, tenantId: session.tenantId },
      'DoorDash cancel delivery error'
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
