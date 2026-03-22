import { headers } from 'next/headers';
import { extractSubdomain } from '@/lib/tenant';
import { convexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import EventsContent from './events-content';

export default async function EventsPage() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) {
    return <EventsContent initialData={null} />;
  }

  try {
    const tenant = await convexClient.query(api.tenants.queries.getBySubdomain, { subdomain });
    if (!tenant || tenant.status !== 'active') {
      return <EventsContent initialData={null} />;
    }

    const [events, dailySpecials] = await Promise.all([
      convexClient.query(api.public.queries.getPublicEvents, { tenantId: tenant._id }),
      convexClient.query(api.public.queries.getDailySpecials, { tenantId: tenant._id }),
    ]);

    return (
      <EventsContent
        initialData={{
          tenantId: tenant._id,
          events,
          dailySpecials,
        }}
      />
    );
  } catch {
    return <EventsContent initialData={null} />;
  }
}
