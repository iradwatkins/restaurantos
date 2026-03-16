import { NextResponse } from 'next/server';
import { api } from '@restaurantos/backend';
import { convexClient } from '@/lib/auth/convex-client';
import { Id } from '@restaurantos/backend/dataModel';
import { getSession } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId } = await params;
    const config = await convexClient.query(api.tenants.queries.getDeliveryConfig, {
      tenantId: tenantId as Id<'tenants'>,
    });

    if (!config) {
      return NextResponse.json({ error: 'Delivery config not found' }, { status: 404 });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error fetching delivery config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId } = await params;
    const { mode } = await request.json();

    if (!mode || !['kitchenhub', 'direct_api'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid delivery mode' }, { status: 400 });
    }

    const result = await convexClient.mutation(api.tenants.mutations.switchDeliveryMode, {
      tenantId: tenantId as Id<'tenants'>,
      mode,
      switchedBy: session.user.id,
    });

    return NextResponse.json({ config: result });
  } catch (error: any) {
    if (error?.message?.includes('At least one platform')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error updating delivery config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
