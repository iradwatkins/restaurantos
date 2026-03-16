'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, Settings, Shield, ScrollText } from 'lucide-react';
import { cn } from '@restaurantos/ui';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tenants', href: '/tenants', icon: Store },
  { name: 'Audit Logs', href: '/audit-logs', icon: ScrollText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  user: { email: string; name: string | null; role: string };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-[260px] flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-primary-foreground">
            <path d="M7 7v3c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 12v5M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <span className="text-sm font-bold text-sidebar-foreground" data-display="true">RestaurantOS</span>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40">Admin</span>
        </div>
      </div>

      {/* Section label */}
      <div className="px-6 pt-6 pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          Platform
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
            {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user.name || 'Admin'}
            </p>
            <p className="truncate text-[11px] text-sidebar-foreground/40">
              {user.email}
            </p>
          </div>
          <Shield className="h-3.5 w-3.5 text-sidebar-foreground/30" />
        </div>
      </div>
    </aside>
  );
}
