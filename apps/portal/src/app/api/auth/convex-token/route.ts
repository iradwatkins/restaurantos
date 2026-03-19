import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { headers } from 'next/headers';
import { extractSubdomain } from '@/lib/tenant';
import { getSessionFromCookies } from '@/lib/auth/session-manager';
import { getPrivateKey, getKeyId } from '@/lib/auth/jwks';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const headersList = await headers();
    const host = headersList.get('host') || '';
    const subdomain = extractSubdomain(host);

    if (!subdomain) {
      return NextResponse.json({ token: null }, { status: 200 });
    }

    const session = await getSessionFromCookies(subdomain);
    if (!session) {
      return NextResponse.json({ token: null }, { status: 200 });
    }

    const baseUrl = new URL(request.url).origin;
    const privateKey = await getPrivateKey();
    const tokenIdentifier = `${baseUrl}|convex|${session.userId}`;

    const convexToken = await new SignJWT({
      sub: tokenIdentifier,
      iss: baseUrl,
      aud: 'convex',
      email: session.email,
      name: session.name,
      role: session.role,
      tenantId: session.tenantId,
    })
      .setProtectedHeader({ alg: 'RS256', kid: getKeyId(), typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(privateKey);

    return NextResponse.json({ token: convexToken });
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate Convex token');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
