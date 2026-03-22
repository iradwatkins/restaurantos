import { headers } from 'next/headers';
import { extractSubdomain } from '@/lib/tenant';
import { convexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import ContactPage from './contact-content';

export default async function ContactServerPage() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) {
    return <ContactPage initialTenant={null} />;
  }

  try {
    const tenant = await convexClient.query(api.tenants.queries.getBySubdomain, { subdomain });
    if (!tenant || tenant.status !== 'active') {
      return <ContactPage initialTenant={null} />;
    }

    return <ContactPage initialTenant={tenant} />;
  } catch {
    return <ContactPage initialTenant={null} />;
  }
}
