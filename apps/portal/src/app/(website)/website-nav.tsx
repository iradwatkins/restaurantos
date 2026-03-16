'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Phone } from 'lucide-react';

export function WebsiteNav({
  tenantName,
  logoUrl,
  hasCatering,
  phone,
}: {
  tenantName: string;
  logoUrl?: string;
  hasCatering: boolean;
  phone?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/our-menu', label: 'Menu' },
    { href: '/events', label: 'Events & Specials' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
    ...(hasCatering ? [{ href: '/catering', label: 'Catering' }] : []),
  ];

  return (
    <header className="sticky top-0 z-50">
      {/* Top utility bar — phone + quick info */}
      {phone && (
        <div className="bg-[#191A19] text-white/80 text-xs py-1.5">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone className="h-3 w-3" />
              Phone Ahead: {phone}
            </a>
            <span className="hidden sm:inline">Order Online For Faster Pick Up</span>
          </div>
        </div>
      )}

      {/* Main nav */}
      <nav className="bg-[#191A19] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 flex-shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt={tenantName} className="h-9 object-contain" />
              ) : (
                <span className="text-lg font-bold text-white">{tenantName}</span>
              )}
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/order"
                className="ml-2 inline-flex items-center justify-center rounded-md bg-[#348726] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2d7520] transition-colors"
              >
                Order Online
              </Link>
            </div>

            {/* Mobile toggle */}
            <button
              className="md:hidden p-2 text-white/70 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div className="md:hidden border-t border-white/10 py-3 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-md"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/order"
                className="block text-center mt-2 rounded-md bg-[#348726] px-4 py-2.5 text-sm font-semibold text-white"
                onClick={() => setMobileOpen(false)}
              >
                Order Online
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
