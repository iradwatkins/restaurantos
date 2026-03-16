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
    <div className="flex h-screen">
      <PortalSidebar tenant={resolved.tenant} user={session.user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PortalHeader tenant={resolved.tenant} user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
