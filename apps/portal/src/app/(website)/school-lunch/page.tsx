import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { extractSubdomain, resolveTenant } from '@/lib/tenant';
import SchoolLunchContent from './school-lunch-content';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) return { title: 'School Lunch Program' };

  try {
    const resolved = await resolveTenant(subdomain);
    if (!resolved) return { title: 'School Lunch Program' };
    const name = resolved.tenant.name;
    return {
      title: `School Lunch Program | ${name}`,
      description: `Fresh, nutritious school lunches delivered to your campus. Weekly menus with balanced meals for students. Order by Sunday at 8pm for the following week.`,
      openGraph: {
        title: `School Lunch Program | ${name}`,
        description: `Fresh, nutritious school lunches delivered to your campus every Wednesday and Friday.`,
        type: 'website',
      },
    };
  } catch {
    return { title: 'School Lunch Program' };
  }
}

export default async function SchoolLunchPage() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  let tenantName = 'D&K Soul Food';
  let primaryColor = '#d32f2f';
  let accentColor = '#f9c80e';
  let phone = '';

  if (subdomain) {
    try {
      const resolved = await resolveTenant(subdomain);
      if (resolved) {
        tenantName = resolved.tenant.name;
        primaryColor = resolved.tenant.primaryColor || primaryColor;
        accentColor = resolved.tenant.accentColor || accentColor;
        phone = resolved.tenant.phone || '';
      }
    } catch {
      // Use defaults
    }
  }

  return (
    <SchoolLunchContent
      tenantName={tenantName}
      primaryColor={primaryColor}
      accentColor={accentColor}
      phone={phone}
    />
  );
}
