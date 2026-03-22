import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { extractSubdomain, resolveTenant } from '@/lib/tenant';
import { generateThemeCSS } from '@/lib/theme';
import { WebsiteShell } from './website-shell';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) {
    return {
      title: 'RestaurantOS',
      description: 'Restaurant management platform',
    };
  }

  try {
    const resolved = await resolveTenant(subdomain);
    if (!resolved) {
      return { title: 'RestaurantOS' };
    }

    const { tenant } = resolved;
    const tenantName = tenant.name;
    const description =
      tenant.heroSubheading ||
      tenant.tagline ||
      `Welcome to ${tenantName} — order online, view our menu, and more.`;
    const canonicalUrl = `https://${subdomain}.restaurantos.app`;
    const heroImage = tenant.logoUrl || undefined;

    return {
      title: {
        default: `${tenantName} - ${description}`,
        template: `%s | ${tenantName}`,
      },
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: `${tenantName} - ${description}`,
        description,
        url: canonicalUrl,
        siteName: tenantName,
        type: 'website',
        ...(heroImage ? { images: [{ url: heroImage, alt: tenantName }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: `${tenantName} - ${description}`,
        description,
      },
    };
  } catch {
    return { title: 'RestaurantOS' };
  }
}

export default async function WebsiteLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  let tenantName = 'Restaurant';
  let themeCSS = '';
  let logoUrl = '';
  let hasCatering = false;
  let hasReservations = false;
  let phone = '';
  let email = '';
  let address: any = null;
  let primaryColor = '';
  let socialLinks: any = null;
  let footerTagline = '';

  if (subdomain) {
    try {
      const resolved = await resolveTenant(subdomain);
      if (resolved) {
        tenantName = resolved.tenant.name;
        logoUrl = resolved.tenant.logoUrl ?? '';
        hasCatering = resolved.tenant.features?.catering ?? false;
        hasReservations = resolved.tenant.reservationsEnabled ?? false;
        phone = resolved.tenant.phone ?? '';
        email = resolved.tenant.email ?? '';
        address = resolved.tenant.address;
        primaryColor = resolved.tenant.primaryColor ?? '';
        socialLinks = resolved.tenant.socialLinks ?? null;
        footerTagline = resolved.tenant.footerTagline ?? '';
        if (resolved.theme) {
          themeCSS = generateThemeCSS(resolved.theme);
        }
      }
    } catch { /* build time */ }
  }

  return (
    <>
      {themeCSS && <style dangerouslySetInnerHTML={{ __html: themeCSS }} />}
      <WebsiteShell
        tenantName={tenantName}
        logoUrl={logoUrl}
        hasCatering={hasCatering}
        hasReservations={hasReservations}
        phone={phone}
        email={email}
        address={address}
        primaryColor={primaryColor}
        socialLinks={socialLinks}
        footerTagline={footerTagline}
      >
        {children}
      </WebsiteShell>
    </>
  );
}
