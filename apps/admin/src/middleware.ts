import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecretEncoded } from './lib/auth/jwt-secret';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/.well-known'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('admin_session_token');
  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify the JWT signature — reject forged or expired tokens
  try {
    const secret = getJwtSecretEncoded();
    await jwtVerify(sessionCookie.value, secret);
  } catch {
    // Token is invalid, expired, or tampered — clear the cookie and redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('admin_session_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health|api/auth/convex-token).*)'],
};
