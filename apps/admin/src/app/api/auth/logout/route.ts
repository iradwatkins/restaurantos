import { NextResponse } from 'next/server';
import { getSessionCookieName } from '@/lib/auth/session-manager';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(getSessionCookieName());
  return response;
}
