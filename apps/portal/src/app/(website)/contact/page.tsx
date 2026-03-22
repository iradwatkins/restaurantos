import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { extractSubdomain, resolveTenant } from '@/lib/tenant';
import { convexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import ContactPage from './contact-content';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) return { title: 'Contact Us' };

  try {
    const resolved = await resolveTenant(subdomain);
    if (!resolved) return { title: 'Contact Us' };
    const name = resolved.tenant.name;
    return {
      title: `Contact Us`,
      description: `Get in touch with ${name}. Find our address, phone number, hours, and send us a message.`,
      openGraph: {
        title: `Contact | ${name}`,
        description: `Get in touch with ${name}`,
        type: 'website',
      },
    };
  } catch {
    return { title: 'Contact Us' };
  }
}

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
