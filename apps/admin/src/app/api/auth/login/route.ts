import { NextResponse } from 'next/server';
import { api } from '@restaurantos/backend';
import { convexClient } from '@/lib/auth/convex-client';
import { compare } from 'bcryptjs';
import { createAndSetSession } from '@/lib/auth/session-manager';
import { logger } from '@/lib/logger';
import { checkLoginRateLimit, recordFailedAttempt, resetAttempts } from '@/lib/login-rate-limit';

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]!.trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: Request) {
  try {
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

    const user = await convexClient.query(api.admin.queries.getAdminByEmail, { email });

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

    await createAndSetSession(response, {
      userId: user._id,
      email: user.email,
      name: user.name || user.email,
      role: user.role,
    });

    await convexClient.mutation(api.admin.mutations.updateLastLogin, { email });

    return response;
  } catch (error) {
    logger.error({ err: error }, 'Login error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
