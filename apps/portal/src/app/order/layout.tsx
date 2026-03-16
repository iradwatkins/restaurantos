import { headers } from 'next/headers';
import { extractSubdomain, resolveTenant } from '@/lib/tenant';
import { generateThemeCSS } from '@/lib/theme';

export default async function OrderLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  let tenantName = 'Restaurant';
  let themeCSS = '';

  if (subdomain) {
    try {
      const resolved = await resolveTenant(subdomain);
      if (resolved) {
        tenantName = resolved.tenant.name;
        if (resolved.theme) {
          themeCSS = generateThemeCSS(resolved.theme);
        }
      }
    } catch { /* build time */ }
  }

  return (
    <>
      {themeCSS && <style dangerouslySetInnerHTML={{ __html: themeCSS }} />}
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-primary">{tenantName}</h1>
            <span className="text-sm text-muted-foreground">Online Ordering</span>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
        <footer className="border-t bg-card mt-12">
          <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
            Powered by RestaurantOS
          </div>
        </footer>
      </div>
    </>
  );
}
