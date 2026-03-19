import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { extractSubdomain } from '@/lib/tenant';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const headersList = await headers();
    const host = headersList.get('host') || '';
    const subdomain = extractSubdomain(host);

    if (!subdomain) {
      return NextResponse.json({ error: 'No subdomain' }, { status: 400 });
    }

    const session = await getSession(subdomain);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({ user: session.user });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
