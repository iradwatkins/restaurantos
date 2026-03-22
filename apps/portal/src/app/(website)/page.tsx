import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { extractSubdomain, resolveTenant } from '@/lib/tenant';
import { convexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import HomeContent from './home-content';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) return {};

  try {
    const resolved = await resolveTenant(subdomain);
    if (!resolved) return {};
    // Homepage uses the layout's default title, so returning empty overrides nothing
    // The layout's generateMetadata already handles og:title, description, etc.
    return {};
  } catch {
    return {};
  }
}

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

    // Build JSON-LD Restaurant structured data
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: tenant.name,
      url: `https://${subdomain}.restaurantos.app`,
      ...(tenant.phone ? { telephone: tenant.phone } : {}),
      ...(tenant.email ? { email: tenant.email } : {}),
      ...(tenant.logoUrl ? { image: tenant.logoUrl } : {}),
      ...(tenant.tagline ? { description: tenant.tagline } : {}),
      ...(tenant.address
        ? {
            address: {
              '@type': 'PostalAddress',
              streetAddress: tenant.address.street,
              addressLocality: tenant.address.city,
              addressRegion: tenant.address.state,
              postalCode: tenant.address.zip,
              addressCountry: tenant.address.country || 'US',
            },
          }
        : {}),
      ...(tenant.businessHours && tenant.businessHours.length > 0
        ? {
            openingHoursSpecification: tenant.businessHours
              .filter((h: any) => !h.isClosed)
              .map((h: any) => ({
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][h.day],
                opens: h.open,
                closes: h.close,
              })),
          }
        : {}),
      ...(menu && menu.length > 0
        ? {
            hasMenu: {
              '@type': 'Menu',
              url: `https://${subdomain}.restaurantos.app/our-menu`,
              hasMenuSection: menu.map((category: any) => ({
                '@type': 'MenuSection',
                name: category.name,
                ...(category.description ? { description: category.description } : {}),
                hasMenuItem: category.items?.slice(0, 10).map((item: any) => ({
                  '@type': 'MenuItem',
                  name: item.name,
                  ...(item.description ? { description: item.description } : {}),
                  offers: {
                    '@type': 'Offer',
                    price: (item.price / 100).toFixed(2),
                    priceCurrency: tenant.currency || 'USD',
                  },
                })),
              })),
            },
          }
        : {}),
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <HomeContent
          initialData={{
            tenant,
            menu,
            todaySpecial,
            publicEvents,
            websiteData,
          }}
        />
      </>
    );
  } catch {
    return <HomeContent initialData={null} />;
  }
}
