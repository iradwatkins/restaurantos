import { NextResponse } from 'next/server';
import { api } from '@restaurantos/backend';
import { convexClient } from '@/lib/auth/convex-client';
import { compare } from 'bcryptjs';
import { createAndSetSession } from '@/lib/auth/session-manager';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await convexClient.query(api.admin.queries.getAdminByEmail, { email });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.status !== 'active') {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
    }

    const validPassword = await compare(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
    });

    await createAndSetSession(response, {
      userId: user._id,
      email: user.email,
      name: user.name || user.email,
      role: user.role,
    });

    await convexClient.mutation(api.admin.mutations.updateLastLogin, { email });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
