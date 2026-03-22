import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { extractSubdomain, resolveTenant } from '@/lib/tenant';
import { convexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import EventsContent from './events-content';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) return { title: 'Events & Specials' };

  try {
    const resolved = await resolveTenant(subdomain);
    if (!resolved) return { title: 'Events & Specials' };
    const name = resolved.tenant.name;
    return {
      title: `Events & Specials`,
      description: `Upcoming events, weekly specials, and daily deals at ${name}.`,
      openGraph: {
        title: `Events & Specials | ${name}`,
        description: `Upcoming events, weekly specials, and daily deals at ${name}`,
        type: 'website',
      },
    };
  } catch {
    return { title: 'Events & Specials' };
  }
}

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

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Build JSON-LD Event structured data
    const eventsJsonLd = events && events.length > 0
      ? events.map((event: any) => ({
          '@context': 'https://schema.org',
          '@type': 'FoodEvent',
          name: event.name,
          ...(event.description ? { description: event.description } : {}),
          url: `https://${subdomain}.restaurantos.app/events`,
          ...(event.startTime ? { startDate: event.startTime } : {}),
          ...(event.endTime ? { endDate: event.endTime } : {}),
          ...(event.recurrence === 'weekly' && event.dayOfWeek !== undefined
            ? { eventSchedule: { '@type': 'Schedule', byDay: DAYS[event.dayOfWeek] } }
            : {}),
          location: {
            '@type': 'Restaurant',
            name: tenant.name,
            ...(tenant.address
              ? {
                  address: {
                    '@type': 'PostalAddress',
                    streetAddress: tenant.address.street,
                    addressLocality: tenant.address.city,
                    addressRegion: tenant.address.state,
                    postalCode: tenant.address.zip,
                  },
                }
              : {}),
          },
          ...(event.pricingTiers && event.pricingTiers.length > 0
            ? {
                offers: event.pricingTiers.map((tier: any) => ({
                  '@type': 'Offer',
                  name: tier.tierName,
                  price: (tier.price / 100).toFixed(2),
                  priceCurrency: 'USD',
                })),
              }
            : {}),
        }))
      : null;

    return (
      <>
        {eventsJsonLd && eventsJsonLd.map((jsonLd: any, idx: number) => (
          <script
            key={idx}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        ))}
        <EventsContent
          initialData={{
            tenantId: tenant._id,
            events,
            dailySpecials,
          }}
        />
      </>
    );
  } catch {
    return <EventsContent initialData={null} />;
  }
}
