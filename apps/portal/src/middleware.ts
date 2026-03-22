import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecretEncoded } from './lib/auth/jwt-secret';

// Exact public paths or path prefixes (with trailing slash to avoid /orders matching /order)
const PUBLIC_PATH_PREFIXES = ['/login', '/api/auth/login', '/.well-known', '/api/webhooks', '/api/stripe', '/api/square/callback'];
const PUBLIC_PATH_EXACT = ['/order'];
const PUBLIC_PATH_STARTS = ['/order/']; // matches /order/track etc.

// Website paths — public when subdomain is present
const WEBSITE_PATHS = ['/', '/our-menu', '/about', '/contact', '/catering', '/events'];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (PUBLIC_PATH_EXACT.includes(pathname)) return true;
  if (PUBLIC_PATH_STARTS.some((p) => pathname.startsWith(p))) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  let subdomain: string | null = null;
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    if (parts.length >= 2 && !parts[0]!.startsWith('localhost')) {
      subdomain = parts[0]!;
    }
  } else {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      subdomain = parts[0]!;
    }
  }

  if (!subdomain) {
    if (pathname === '/') {
      return NextResponse.json(
        { error: 'Please access via your restaurant subdomain' },
        { status: 400 }
      );
    }
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.headers.set('x-tenant-subdomain', subdomain);

  // Always allow public paths
  if (isPublicPath(pathname)) {
    return response;
  }

  // Allow website paths when subdomain is present (public restaurant website)
  if (WEBSITE_PATHS.some((path) => pathname === path)) {
    return response;
  }

  // Dashboard routes require auth
  const isApiRoute = pathname.startsWith('/api/');
  const sessionCookie = request.cookies.get(`${subdomain}_session_token`);
  if (!sessionCookie?.value) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify the JWT signature — reject forged or expired tokens
  try {
    const secret = getJwtSecretEncoded();
    await jwtVerify(sessionCookie.value, secret);
  } catch {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Token is invalid, expired, or tampered — clear the cookie and redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.cookies.delete(`${subdomain}_session_token`);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health|api/auth/convex-token).*)'],
};
