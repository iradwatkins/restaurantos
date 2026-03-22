import { headers } from 'next/headers';
import { extractSubdomain } from '@/lib/tenant';
import { convexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import MenuShowcasePage from './menu-content';

export default async function MenuPage() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) {
    return <MenuShowcasePage initialMenu={null} />;
  }

  try {
    const tenant = await convexClient.query(api.tenants.queries.getBySubdomain, { subdomain });
    if (!tenant || tenant.status !== 'active') {
      return <MenuShowcasePage initialMenu={null} />;
    }

    const menu = await convexClient.query(api.public.queries.getFullMenu, { tenantId: tenant._id });

    return <MenuShowcasePage initialMenu={menu} />;
  } catch {
    return <MenuShowcasePage initialMenu={null} />;
  }
}
