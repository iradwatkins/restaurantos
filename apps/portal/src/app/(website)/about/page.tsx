import { headers } from 'next/headers';
import { extractSubdomain } from '@/lib/tenant';
import { convexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import AboutPage from './about-content';

export default async function AboutServerPage() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) {
    return <AboutPage initialData={null} />;
  }

  try {
    const tenant = await convexClient.query(api.tenants.queries.getBySubdomain, { subdomain });
    if (!tenant || tenant.status !== 'active') {
      return <AboutPage initialData={null} />;
    }

    const websiteData = await convexClient.query(api.public.queries.getTenantWebsite, { subdomain });

    return (
      <AboutPage
        initialData={{
          tenant,
          websiteData,
        }}
      />
    );
  } catch {
    return <AboutPage initialData={null} />;
  }
}
