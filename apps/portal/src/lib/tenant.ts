import { api } from '@restaurantos/backend';
import { convexClient } from './auth/convex-client';

export async function resolveTenant(subdomain: string) {
  const tenant = await convexClient.query(api.tenants.queries.getBySubdomain, { subdomain });
  if (!tenant || tenant.status !== 'active') return null;

  const theme = await convexClient.query(api.tenants.queries.getTheme, { tenantId: tenant._id });
  return { tenant, theme };
}

export function extractSubdomain(hostname: string): string | null {
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    if (parts.length >= 2 && parts[0] !== 'localhost') {
      return parts[0]!;
    }
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0]!;
  }

  return null;
}
