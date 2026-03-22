import { headers } from 'next/headers';
import { extractSubdomain } from '@/lib/tenant';
import { convexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import CateringPage from './catering-content';

export default async function CateringServerPage() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) {
    return <CateringPage initialData={null} />;
  }

  try {
    const tenant = await convexClient.query(api.tenants.queries.getBySubdomain, { subdomain });
    if (!tenant || tenant.status !== 'active') {
      return <CateringPage initialData={null} />;
    }

    const cateringMenu = await convexClient.query(api.public.queries.getCateringMenu, {
      tenantId: tenant._id,
    });

    return (
      <CateringPage
        initialData={{
          tenant,
          cateringMenu,
        }}
      />
    );
  } catch {
    return <CateringPage initialData={null} />;
  }
}
