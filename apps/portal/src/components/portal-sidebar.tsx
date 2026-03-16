'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  ChefHat,
  BarChart3,
  Settings,
  Globe,
  Utensils,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@restaurantos/ui';

const mainNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: ClipboardList },
  { name: 'Kitchen (KDS)', href: '/kds', icon: ChefHat },
];

const manageNav = [
  { name: 'Menu', href: '/menu', icon: UtensilsCrossed },
  { name: 'Events', href: '/events-mgmt', icon: CalendarDays },
  { name: 'Catering', href: '/catering-mgmt', icon: Utensils },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface PortalSidebarProps {
  tenant: { name: string };
  user: { email: string; name: string | null; role: string };
}

function NavSection({ items, pathname }: { items: typeof mainNav; pathname: string }) {
  return (
    <div className="space-y-0.5">
      {items.map((item) => {
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
    </div>
  );
}

export function PortalSidebar({ tenant, user }: PortalSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-[260px] flex-col border-r border-sidebar-border bg-sidebar">
      {/* Restaurant name */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <UtensilsCrossed className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <span className="block text-sm font-bold text-sidebar-foreground truncate" data-display="true">
            {tenant.name}
          </span>
          <span className="block text-[10px] font-medium text-sidebar-foreground/40 capitalize">
            {user.role}
          </span>
        </div>
      </div>

      {/* Operations */}
      <div className="px-6 pt-6 pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          Operations
        </span>
      </div>
      <nav className="px-3">
        <NavSection items={mainNav} pathname={pathname} />
      </nav>

      {/* Management */}
      <div className="px-6 pt-5 pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          Management
        </span>
      </div>
      <nav className="flex-1 px-3">
        <NavSection items={manageNav} pathname={pathname} />
      </nav>

      {/* Online ordering link */}
      <div className="px-3 pb-3">
        <Link
          href="/order"
          target="_blank"
          className="flex items-center gap-3 rounded-lg border border-dashed border-sidebar-border px-3 py-2.5 text-xs font-medium text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground hover:border-sidebar-foreground/30"
        >
          <Globe className="h-4 w-4" />
          Online Ordering Page
        </Link>
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
            {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name || user.email}</p>
            <p className="truncate text-[11px] text-sidebar-foreground/40">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
