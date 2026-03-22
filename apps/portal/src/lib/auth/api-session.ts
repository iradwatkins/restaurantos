import { jwtVerify } from 'jose';
import { getJwtSecretEncoded } from './jwt-secret';
import { extractSubdomain } from '../tenant';

interface ApiSessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

/**
 * Extract and verify the authenticated session from an API request.
 *
 * Reads the subdomain from the Host header, looks up the corresponding
 * session cookie (`{subdomain}_session_token`), and verifies the JWT.
 *
 * Returns null if any step fails (no subdomain, no cookie, invalid JWT).
 * Callers should return a 401 response when null is returned.
 */
export async function getApiSession(request: Request): Promise<ApiSessionPayload | null> {
  const hostname = request.headers.get('host') || '';
  const subdomain = extractSubdomain(hostname);
  if (!subdomain) return null;

  // Parse cookies from the Cookie header
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookieName = `${subdomain}_session_token`;
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...rest] = c.trim().split('=');
      return [key, rest.join('=')];
    })
  );

  const token = cookies[cookieName];
  if (!token) return null;

  try {
    const secret = getJwtSecretEncoded();
    const { payload } = await jwtVerify(token, secret);

    const userId = payload.userId as string | undefined;
    const email = payload.email as string | undefined;
    const tenantId = payload.tenantId as string | undefined;

    if (!userId || !email || !tenantId) return null;

    return {
      userId,
      email,
      name: (payload.name as string) || '',
      role: (payload.role as string) || '',
      tenantId,
    };
  } catch {
    return null;
  }
}
