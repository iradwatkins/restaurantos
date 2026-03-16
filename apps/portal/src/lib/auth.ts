import { getSessionFromCookies } from './auth/session-manager';

export async function getSession(subdomain: string) {
  const session = await getSessionFromCookies(subdomain);
  if (!session) return null;

  return {
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      tenantId: session.tenantId,
    },
  };
}
