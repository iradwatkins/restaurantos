import { getSessionFromCookies } from './auth/session-manager';

export interface AdminSessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface AdminSessionResult {
  user: AdminSessionUser;
}

export async function getSession(): Promise<AdminSessionResult | null> {
  const session = await getSessionFromCookies();
  if (!session) return null;

  return {
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
    },
  };
}
