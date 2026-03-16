'use client';

import { WebsiteNav } from './website-nav';
import { WebsiteFooter } from './website-footer';

export function WebsiteShell({
  tenantName,
  logoUrl,
  hasCatering,
  phone,
  email,
  address,
  children,
}: {
  tenantName: string;
  logoUrl?: string;
  hasCatering: boolean;
  phone?: string;
  email?: string;
  address?: any;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WebsiteNav
        tenantName={tenantName}
        logoUrl={logoUrl}
        hasCatering={hasCatering}
        phone={phone}
      />
      <main className="flex-1">{children}</main>
      <WebsiteFooter
        tenantName={tenantName}
        phone={phone}
        email={email}
        address={address}
      />
    </div>
  );
}
