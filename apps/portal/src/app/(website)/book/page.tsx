import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { extractSubdomain, resolveTenant } from '@/lib/tenant';
import { convexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import ReservationsPage from './reservations-content';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) return { title: 'Reservations' };

  try {
    const resolved = await resolveTenant(subdomain);
    if (!resolved) return { title: 'Reservations' };
    const name = resolved.tenant.name;
    return {
      title: `Reservations`,
      description: `Book a table at ${name}. Reserve online for your preferred date and time.`,
      openGraph: {
        title: `Reservations | ${name}`,
        description: `Book a table at ${name}`,
        type: 'website',
      },
    };
  } catch {
    return { title: 'Reservations' };
  }
}

export default async function ReservationsServerPage() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) {
    return <ReservationsPage initialData={null} />;
  }

  try {
    const tenant = await convexClient.query(api.tenants.queries.getBySubdomain, { subdomain });
    if (!tenant || tenant.status !== 'active' || !tenant.reservationsEnabled) {
      return <ReservationsPage initialData={null} />;
    }

    return (
      <ReservationsPage
        initialData={{
          tenantId: tenant._id,
          tenantName: tenant.name,
          maxPartySize: tenant.reservationMaxPartySize ?? 20,
          maxDaysAhead: tenant.reservationMaxDaysAhead ?? 30,
          slotMinutes: tenant.reservationSlotMinutes ?? 30,
          defaultDuration: tenant.reservationDefaultDuration ?? 90,
          primaryColor: tenant.primaryColor,
        }}
      />
    );
  } catch {
    return <ReservationsPage initialData={null} />;
  }
}
