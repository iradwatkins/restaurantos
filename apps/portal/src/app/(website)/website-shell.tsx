'use client';

import { WebsiteNav } from './website-nav';
import { WebsiteFooter } from './website-footer';

export function WebsiteShell({
  tenantName,
  logoUrl,
  hasCatering,
  hasReservations,
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
  hasReservations?: boolean;
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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md"
      >
        Skip to content
      </a>
      <WebsiteNav
        tenantName={tenantName}
        logoUrl={logoUrl}
        hasCatering={hasCatering}
        hasReservations={hasReservations}
        phone={phone}
        primaryColor={primaryColor}
      />
      <main id="main-content" className="flex-1">{children}</main>
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
