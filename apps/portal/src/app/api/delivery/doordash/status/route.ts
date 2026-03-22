import { NextResponse } from 'next/server';
import { getApiSession } from '@/lib/auth/api-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { DoordashDriveClient } from '@/lib/doordash/client';
import { convexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`doordash-status:${ip}`, {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const deliveryId = searchParams.get('deliveryId');

    if (!deliveryId) {
      return NextResponse.json(
        { error: 'deliveryId query parameter is required' },
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

    const delivery = await client.getDelivery(deliveryId);

    return NextResponse.json({
      status: delivery.delivery_status,
      driverName: delivery.dasher_name ?? null,
      driverPhone: delivery.dasher_phone_number ?? null,
      estimatedDropoff: delivery.dropoff_time_estimated || delivery.estimated_dropoff_time || null,
      trackingUrl: delivery.tracking_url,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get delivery status';
    logger.error(
      { err: err instanceof Error ? err : undefined, tenantId: session.tenantId },
      'DoorDash get delivery status error'
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
