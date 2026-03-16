import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Exact public paths or path prefixes (with trailing slash to avoid /orders matching /order)
const PUBLIC_PATH_PREFIXES = ['/login', '/api/auth/login', '/.well-known', '/api/webhooks', '/api/stripe'];
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

export function middleware(request: NextRequest) {
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
  const sessionCookie = request.cookies.get(`${subdomain}_session_token`);
  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health|api/auth/convex-token).*)'],
};
