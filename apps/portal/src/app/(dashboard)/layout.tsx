import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { extractSubdomain, resolveTenant } from '@/lib/tenant';
import { getSession } from '@/lib/auth';
import { PortalSidebar } from '@/components/portal-sidebar';
import { PortalHeader } from '@/components/portal-header';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) redirect('/login');

  const resolved = await resolveTenant(subdomain);
  if (!resolved) redirect('/login');

  const session = await getSession(subdomain);
  if (!session) redirect('/login');

  return (
    <div className="flex h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:underline"
      >
        Skip to content
      </a>
      <PortalSidebar tenant={resolved.tenant} user={session.user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PortalHeader tenant={resolved.tenant} user={session.user} />
        <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden px-8 py-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
