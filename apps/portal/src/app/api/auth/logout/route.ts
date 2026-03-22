import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { extractSubdomain } from '@/lib/tenant';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const headersList = await headers();
    const host = headersList.get('host') || '';
    const subdomain = extractSubdomain(host);

    const response = NextResponse.json({ success: true });

    if (subdomain) {
      response.cookies.delete(`${subdomain}_session_token`);
    }

    return response;
  } catch (error) {
    logger.error({ err: error }, 'Logout error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
