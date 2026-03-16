import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/.well-known', '/order', '/api/webhooks'];

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

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return response;
  }

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
