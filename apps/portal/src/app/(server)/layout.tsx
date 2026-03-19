import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { extractSubdomain, resolveTenant } from '@/lib/tenant';
import { getSession } from '@/lib/auth';
import { ServerTopBar } from '@/components/server-top-bar';

export default async function ServerLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  if (!subdomain) redirect('/login');

  const resolved = await resolveTenant(subdomain);
  if (!resolved) redirect('/login');

  const session = await getSession(subdomain);
  if (!session) redirect('/login');

  return (
    <div className="flex h-screen flex-col bg-background">
      <ServerTopBar
        tenantName={resolved.tenant.name}
        serverName={session.user.name}
        userRole={session.user.role}
      />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
