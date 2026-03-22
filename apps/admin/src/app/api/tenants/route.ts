import { NextResponse } from 'next/server';
import { api } from '@restaurantos/backend';
import { convexClient } from '@/lib/auth/convex-client';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenants = await convexClient.query(api.tenants.queries.list, {});
    return NextResponse.json({ tenants });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching tenants');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    if (!data.name || !data.subdomain || !data.ownerEmail || !data.ownerPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create tenant (includes theme + delivery config automatically)
    const tenantId = await convexClient.mutation(api.tenants.mutations.create, {
      slug: data.subdomain,
      name: data.name,
      subdomain: data.subdomain,
      status: data.status ?? 'active',
      primaryColor: data.primaryColor || undefined,
      accentColor: data.accentColor || undefined,
      deliveryMode: data.deliveryMode ?? 'kitchenhub',
      phone: data.phone || undefined,
      email: data.email || undefined,
      plan: data.plan ?? 'growth',
    });

    // Create owner user
    await convexClient.mutation(api.users.mutations.create, {
      tenantId,
      email: data.ownerEmail,
      password: data.ownerPassword,
      name: data.ownerName,
      role: 'owner',
    });

    const tenant = await convexClient.query(api.tenants.queries.getById, { id: tenantId });

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error: any) {
    if (error?.message?.includes('Subdomain already taken')) {
      return NextResponse.json({ error: 'Subdomain already taken' }, { status: 409 });
    }
    logger.error({ err: error }, 'Error creating tenant');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
