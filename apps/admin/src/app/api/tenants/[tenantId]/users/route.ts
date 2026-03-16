import { NextResponse } from 'next/server';
import { api } from '@restaurantos/backend';
import { convexClient } from '@/lib/auth/convex-client';
import { Id } from '@restaurantos/backend/dataModel';
import { hash } from 'bcryptjs';
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
    const users = await convexClient.query(api.users.queries.listByTenant, {
      tenantId: tenantId as Id<'tenants'>,
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching tenant users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId } = await params;
    const data = await request.json();

    if (!data.email || !data.password || !data.role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const passwordHash = await hash(data.password, 12);

    const userId = await convexClient.mutation(api.users.mutations.create, {
      tenantId: tenantId as Id<'tenants'>,
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role,
    });

    return NextResponse.json({ userId }, { status: 201 });
  } catch (error: any) {
    if (error?.message?.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Error creating tenant user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
