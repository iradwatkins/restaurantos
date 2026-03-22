import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { extractSubdomain, resolveTenant } from '@/lib/tenant';
import { convexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import MenuShowcasePage from './menu-content';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) return { title: 'Our Menu' };

  try {
    const resolved = await resolveTenant(subdomain);
    if (!resolved) return { title: 'Our Menu' };
    const name = resolved.tenant.name;
    return {
      title: `Our Menu`,
      description: `Browse the full menu at ${name}. Fresh ingredients, expertly prepared.`,
      openGraph: {
        title: `Menu | ${name}`,
        description: `Browse the full menu at ${name}`,
        type: 'website',
      },
    };
  } catch {
    return { title: 'Our Menu' };
  }
}

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

    // Build JSON-LD Menu structured data
    const menuJsonLd = menu && menu.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'Menu',
          name: `${tenant.name} Menu`,
          url: `https://${subdomain}.restaurantos.app/our-menu`,
          hasMenuSection: menu.map((category: any) => ({
            '@type': 'MenuSection',
            name: category.name,
            ...(category.description ? { description: category.description } : {}),
            hasMenuItem: category.items?.map((item: any) => ({
              '@type': 'MenuItem',
              name: item.name,
              ...(item.description ? { description: item.description } : {}),
              offers: {
                '@type': 'Offer',
                price: (item.price / 100).toFixed(2),
                priceCurrency: 'USD',
              },
            })),
          })),
        }
      : null;

    return (
      <>
        {menuJsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(menuJsonLd) }}
          />
        )}
        <MenuShowcasePage initialMenu={menu} />
      </>
    );
  } catch {
    return <MenuShowcasePage initialMenu={null} />;
  }
}
