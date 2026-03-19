import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { api } from '@restaurantos/backend';
import { convexClient } from '@/lib/auth/convex-client';
import { compare } from 'bcryptjs';
import { extractSubdomain } from '@/lib/tenant';
import { createAndSetSession } from '@/lib/auth/session-manager';
import { logger } from '@/lib/logger';
import { getClientIp } from '@/lib/rate-limit';
import { checkLoginRateLimit, recordFailedAttempt, resetAttempts } from '@/lib/login-rate-limit';

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const host = headersList.get('host') || '';
    const subdomain = extractSubdomain(host);

    if (!subdomain) {
      return NextResponse.json({ error: 'Invalid subdomain' }, { status: 400 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Brute-force protection: check rate limit by IP + email
    const ip = getClientIp(request);
    const rateLimitKey = `${ip}:${email}`;
    const { allowed, retryAfterMs } = checkLoginRateLimit(rateLimitKey);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((retryAfterMs || 0) / 1000)) },
        }
      );
    }

    // Find tenant by subdomain
    const tenant = await convexClient.query(api.tenants.queries.getBySubdomain, { subdomain });
    if (!tenant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Find user scoped to tenant
    const user = await convexClient.query(api.users.queries.getByTenantAndEmail, {
      tenantId: tenant._id,
      email,
    });

    if (!user || !user.passwordHash) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.status !== 'active') {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
    }

    const validPassword = await compare(password, user.passwordHash);
    if (!validPassword) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Successful login — reset rate limit counter
    resetAttempts(rateLimitKey);

    const response = NextResponse.json({
      success: true,
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
    });

    await createAndSetSession(
      response,
      {
        userId: user._id,
        email: user.email,
        name: user.name || user.email,
        role: user.role,
        tenantId: tenant._id,
      },
      subdomain
    );

    await convexClient.mutation(api.users.mutations.updateLastLogin, { userId: user._id });

    return response;
  } catch (error) {
    logger.error({ err: error }, 'Login error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
