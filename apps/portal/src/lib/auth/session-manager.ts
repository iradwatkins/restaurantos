import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getJwtSecretEncoded } from './jwt-secret';

function getCookieName(subdomain: string): string {
  return `${subdomain}_session_token`;
}

interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

export async function createAndSetSession(
  response: NextResponse,
  payload: SessionPayload,
  subdomain: string
) {
  const secret = getJwtSecretEncoded();

  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    tenantId: payload.tenantId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);

  response.cookies.set(getCookieName(subdomain), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  return token;
}

export async function getSessionFromCookies(
  subdomain: string
): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName(subdomain))?.value;
  if (!token) return null;

  try {
    const secret = getJwtSecretEncoded();
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
      tenantId: payload.tenantId as string,
    };
  } catch {
    return null;
  }
}
