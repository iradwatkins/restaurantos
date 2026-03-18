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
  primaryColor,
  socialLinks,
  footerTagline,
  children,
}: {
  tenantName: string;
  logoUrl?: string;
  hasCatering: boolean;
  phone?: string;
  email?: string;
  address?: any;
  primaryColor?: string;
  socialLinks?: { facebook?: string; instagram?: string; twitter?: string; yelp?: string } | null;
  footerTagline?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WebsiteNav
        tenantName={tenantName}
        logoUrl={logoUrl}
        hasCatering={hasCatering}
        phone={phone}
        primaryColor={primaryColor}
      />
      <main className="flex-1">{children}</main>
      <WebsiteFooter
        tenantName={tenantName}
        phone={phone}
        email={email}
        address={address}
        socialLinks={socialLinks}
        footerTagline={footerTagline}
      />
    </div>
  );
}
