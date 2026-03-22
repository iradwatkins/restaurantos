'use client';

import { useState, useEffect } from 'react';
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
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Warehouse,
  Clock,
  Grid2X2,
  BookOpen,
  Megaphone,
  Truck,
} from 'lucide-react';
import { cn } from '@restaurantos/ui';

const STORAGE_KEY = 'portal-sidebar-collapsed';

const mainNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: ClipboardList },
  { name: 'Kitchen (KDS)', href: '/kds', icon: ChefHat },
  { name: 'Deliveries', href: '/deliveries', icon: Truck },
  { name: 'Reservations', href: '/reservations', icon: BookOpen },
  { name: 'Floor Plan', href: '/floor-plan', icon: Grid2X2 },
];

const manageNav = [
  { name: 'Menu', href: '/menu', icon: UtensilsCrossed },
  { name: 'Inventory', href: '/inventory', icon: Warehouse },
  { name: 'Scheduling', href: '/scheduling', icon: Clock },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Marketing', href: '/marketing', icon: Megaphone },
  { name: 'Events', href: '/events-mgmt', icon: CalendarDays },
  { name: 'Catering', href: '/catering-mgmt', icon: Utensils },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface PortalSidebarProps {
  tenant: { name: string };
  user: { email: string; name: string | null; role: string };
}

function NavSection({
  items,
  pathname,
  collapsed,
}: {
  items: typeof mainNav;
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.name}
            href={item.href}
            title={collapsed ? item.name : undefined}
            className={cn(
              'group/nav relative flex items-center rounded-lg text-sm font-medium transition-all duration-200',
              collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            )}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{item.name}</span>}

            {/* Tooltip on hover when collapsed */}
            {collapsed && (
              <span
                role="tooltip"
                className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover/nav:opacity-100"
              >
                {item.name}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function PortalSidebar({ tenant, user }: PortalSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load persisted state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setCollapsed(true);
    setMounted(true);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  // Prevent layout flash by rendering at expanded width until mounted
  const isCollapsed = mounted ? collapsed : false;

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out',
        isCollapsed ? 'w-16' : 'w-[260px]'
      )}
    >
      {/* Restaurant name / logo */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-sidebar-border',
          isCollapsed ? 'justify-center px-2' : 'gap-3 px-6'
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <UtensilsCrossed className="h-4 w-4" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <span className="block text-sm font-bold text-sidebar-foreground truncate" data-display="true">
              {tenant.name}
            </span>
            <span className="block text-[10px] font-medium text-sidebar-foreground/40 capitalize">
              {user.role}
            </span>
          </div>
        )}
      </div>

      {/* Operations */}
      {!isCollapsed && (
        <div className="px-6 pt-6 pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Operations
          </span>
        </div>
      )}
      <nav className={cn(isCollapsed ? 'px-2 pt-4' : 'px-3', !isCollapsed && 'pt-0')}>
        <NavSection items={mainNav} pathname={pathname} collapsed={isCollapsed} />
      </nav>

      {/* Management */}
      {!isCollapsed && (
        <div className="px-6 pt-5 pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Management
          </span>
        </div>
      )}
      <nav className={cn('flex-1', isCollapsed ? 'px-2 pt-3' : 'px-3')}>
        <NavSection items={manageNav} pathname={pathname} collapsed={isCollapsed} />
      </nav>

      {/* Online ordering link */}
      <div className={cn(isCollapsed ? 'px-2 pb-3' : 'px-3 pb-3')}>
        <Link
          href="/order"
          target="_blank"
          title={isCollapsed ? 'Online Ordering Page' : undefined}
          className={cn(
            'group/nav relative flex items-center rounded-lg border border-dashed border-sidebar-border text-xs font-medium text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground hover:border-sidebar-foreground/30',
            isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
          )}
        >
          <Globe className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Online Ordering Page</span>}

          {isCollapsed && (
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover/nav:opacity-100"
            >
              Online Ordering
            </span>
          )}
        </Link>
      </div>

      {/* Collapse toggle */}
      <div className={cn('border-t border-sidebar-border', isCollapsed ? 'px-2 py-3' : 'px-3 py-3')}>
        <button
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex w-full items-center rounded-lg text-sm font-medium text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
            isCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
          )}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px]" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Footer — user info */}
      <div className={cn('border-t border-sidebar-border', isCollapsed ? 'p-2' : 'p-4')}>
        <div
          className={cn(
            'group/user relative flex items-center',
            isCollapsed ? 'justify-center' : 'gap-3 px-2'
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
            {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name || user.email}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/40">{user.email}</p>
            </div>
          )}

          {isCollapsed && (
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover/user:opacity-100"
            >
              {user.name || user.email}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
