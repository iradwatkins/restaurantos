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
  const rateLimit = checkRateLimit(`doordash-quote:${ip}`, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { pickupAddress, dropoffAddress, orderValue } = body;

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

    const client = new DoordashDriveClient({
      developerId: tenant.doordashDeveloperId,
      keyId: tenant.doordashKeyId,
      signingSecret: tenant.doordashSigningSecret,
    });

    const quote = await client.createQuote({
      pickupAddress: {
        street: pickupAddress.street,
        city: pickupAddress.city,
        state: pickupAddress.state,
        zipCode: pickupAddress.zipCode || pickupAddress.zip,
      },
      dropoffAddress: {
        street: dropoffAddress.street,
        city: dropoffAddress.city,
        state: dropoffAddress.state,
        zipCode: dropoffAddress.zipCode || dropoffAddress.zip,
      },
      orderValue,
    });

    return NextResponse.json({
      estimatedFee: quote.fee,
      estimatedPickupTime: quote.pickup_time_estimated || quote.estimated_pickup_time,
      estimatedDropoffTime: quote.dropoff_time_estimated || quote.estimated_dropoff_time,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get delivery quote';
    logger.error(
      { err: err instanceof Error ? err : undefined, tenantId: session.tenantId },
      'DoorDash quote error'
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
