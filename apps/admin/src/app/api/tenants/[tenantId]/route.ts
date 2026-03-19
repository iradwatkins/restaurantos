import { NextResponse } from 'next/server';
import { api } from '@restaurantos/backend';
import { convexClient } from '@/lib/auth/convex-client';
import { Id } from '@restaurantos/backend/dataModel';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';

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
    const tenant = await convexClient.query(api.tenants.queries.getById, {
      id: tenantId as Id<'tenants'>,
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({ tenant });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching tenant');
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
    const body = await request.json();

    await convexClient.mutation(api.tenants.mutations.update, {
      id: tenantId as Id<'tenants'>,
      ...body,
    });

    const updated = await convexClient.query(api.tenants.queries.getById, {
      id: tenantId as Id<'tenants'>,
    });

    return NextResponse.json({ tenant: updated });
  } catch (error) {
    logger.error({ err: error }, 'Error updating tenant');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
