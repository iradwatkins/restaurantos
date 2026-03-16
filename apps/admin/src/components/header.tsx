'use client';

import { useRouter, usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Badge,
} from '@restaurantos/ui';
import { LogOut, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tenants': 'Tenants',
  '/settings': 'Settings',
};

interface HeaderProps {
  user: { email: string; name: string | null; role: string };
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    toast.success('Logged out');
    router.push('/login');
    router.refresh();
  }

  // Build breadcrumb
  const segments = pathname.split('/').filter(Boolean);
  const pageTitle = ROUTE_TITLES[pathname] || segments[segments.length - 1] || 'Dashboard';

  return (
    <header className="flex h-16 items-center justify-between border-b border-border/60 px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Admin</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
        <span className="font-medium text-foreground">{pageTitle}</span>
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {user.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium leading-none">{user.name || 'Admin'}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{user.role.replace('_', ' ')}</p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{user.name || 'Admin'}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <Badge variant="outline" className="mt-2 text-[10px] capitalize">
              {user.role.replace('_', ' ')}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
