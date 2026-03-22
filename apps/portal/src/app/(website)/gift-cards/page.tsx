import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { extractSubdomain, resolveTenant } from '@/lib/tenant';
import { convexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import GiftCardsContent from './gift-cards-content';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) return { title: 'Gift Cards' };

  try {
    const resolved = await resolveTenant(subdomain);
    if (!resolved) return { title: 'Gift Cards' };
    const name = resolved.tenant.name;
    return {
      title: `${name} - Gift Cards`,
      description: `Purchase a gift card for ${name}. The perfect gift for any occasion.`,
      openGraph: {
        title: `${name} - Gift Cards`,
        description: `Purchase a gift card for ${name}`,
        type: 'website',
      },
    };
  } catch {
    return { title: 'Gift Cards' };
  }
}

export default async function GiftCardsServerPage() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) {
    return <GiftCardsContent initialData={null} />;
  }

  try {
    const tenant = await convexClient.query(api.tenants.queries.getBySubdomain, { subdomain });
    if (!tenant || tenant.status !== 'active') {
      return <GiftCardsContent initialData={null} />;
    }

    return (
      <GiftCardsContent
        initialData={{
          tenant,
        }}
      />
    );
  } catch {
    return <GiftCardsContent initialData={null} />;
  }
}
