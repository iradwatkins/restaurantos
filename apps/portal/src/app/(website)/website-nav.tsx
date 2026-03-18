'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone } from 'lucide-react';

export function WebsiteNav({
  tenantName,
  logoUrl,
  hasCatering,
  phone,
  primaryColor,
}: {
  tenantName: string;
  logoUrl?: string;
  hasCatering: boolean;
  phone?: string;
  primaryColor?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  const ctaColor = primaryColor || '#348726';

  // Close mobile menu on click outside
  useEffect(() => {
    if (!mobileOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileOpen]);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/our-menu', label: 'Menu' },
    { href: '/events', label: 'Events & Specials' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
    ...(hasCatering ? [{ href: '/catering', label: 'Catering' }] : []),
  ];

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-50" ref={navRef}>
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
      <nav className="bg-[#191A19] border-b border-white/10" aria-label="Main navigation">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 flex-shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt={`${tenantName} logo`} className="h-9 object-contain" />
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
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive(link.href)
                      ? 'text-white font-semibold bg-white/10'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/order"
                className="ml-2 inline-flex items-center justify-center rounded-md px-5 py-2 text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: ctaColor }}
              >
                Order Online
              </Link>
            </div>

            {/* Mobile toggle */}
            <button
              className="md:hidden p-2 text-white/70 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
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
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive(link.href)
                      ? 'text-white font-semibold bg-white/10'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/order"
                className="block text-center mt-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: ctaColor }}
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
