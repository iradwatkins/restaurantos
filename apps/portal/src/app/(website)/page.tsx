import { headers } from 'next/headers';
import { extractSubdomain } from '@/lib/tenant';
import { convexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import HomeContent from './home-content';

export default async function HomePage() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) {
    return <HomeContent initialData={null} />;
  }

  try {
    const tenant = await convexClient.query(api.tenants.queries.getBySubdomain, { subdomain });
    if (!tenant || tenant.status !== 'active') {
      return <HomeContent initialData={null} />;
    }

    const [menu, todaySpecial, publicEvents, websiteData] = await Promise.all([
      convexClient.query(api.public.queries.getFullMenu, { tenantId: tenant._id }),
      convexClient.query(api.public.queries.getTodaySpecial, { tenantId: tenant._id }),
      convexClient.query(api.public.queries.getPublicEvents, { tenantId: tenant._id }),
      convexClient.query(api.public.queries.getTenantWebsite, { subdomain }),
    ]);

    return (
      <HomeContent
        initialData={{
          tenant,
          menu,
          todaySpecial,
          publicEvents,
          websiteData,
        }}
      />
    );
  } catch {
    return <HomeContent initialData={null} />;
  }
}
