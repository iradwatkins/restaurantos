import { NextResponse } from 'next/server';
import { getApiSession } from '@/lib/auth/api-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { DoordashDriveClient } from '@/lib/doordash/client';
import { logger } from '@/lib/logger';

/**
 * Test DoorDash Drive connection by attempting to create a quote with a dummy address.
 * The credentials are passed in the request body (from the settings form, before saving).
 */
export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`doordash-test:${ip}`, {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { developerId, keyId, signingSecret } = body;

    if (!developerId || !keyId || !signingSecret) {
      return NextResponse.json(
        { error: 'developerId, keyId, and signingSecret are required' },
        { status: 400 }
      );
    }

    const client = new DoordashDriveClient({
      developerId,
      keyId,
      signingSecret,
    });

    // Use a dummy quote request to test authentication
    // DoorDash will return an auth error if credentials are wrong, or a quote response if correct
    await client.createQuote({
      pickupAddress: {
        street: '1 Market St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
      },
      dropoffAddress: {
        street: '100 Mission St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection test failed';
    logger.error(
      { err: err instanceof Error ? err : undefined, tenantId: session.tenantId },
      'DoorDash connection test failed'
    );
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
