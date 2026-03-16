import { headers } from 'next/headers';
import { extractSubdomain, resolveTenant } from '@/lib/tenant';
import { generateThemeCSS } from '@/lib/theme';
import { WebsiteShell } from './website-shell';

export default async function WebsiteLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  let tenantName = 'Restaurant';
  let themeCSS = '';
  let logoUrl = '';
  let hasCatering = false;
  let phone = '';
  let email = '';
  let address: any = null;

  if (subdomain) {
    try {
      const resolved = await resolveTenant(subdomain);
      if (resolved) {
        tenantName = resolved.tenant.name;
        logoUrl = resolved.tenant.logoUrl ?? '';
        hasCatering = resolved.tenant.features?.catering ?? false;
        phone = resolved.tenant.phone ?? '';
        email = resolved.tenant.email ?? '';
        address = resolved.tenant.address;
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
        phone={phone}
        email={email}
        address={address}
      >
        {children}
      </WebsiteShell>
    </>
  );
}
