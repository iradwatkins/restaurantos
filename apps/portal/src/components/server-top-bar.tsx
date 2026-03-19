'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@restaurantos/ui';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';

interface ServerTopBarProps {
  tenantName: string;
  serverName: string;
  userRole: string;
}

export function ServerTopBar({ tenantName, serverName, userRole }: ServerTopBarProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      toast.error('Failed to log out');
    }
  }

  return (
    <div className="flex h-14 items-center justify-between border-b bg-card px-4 shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-sm">{tenantName}</span>
        <span className="text-muted-foreground text-sm">|</span>
        <span className="text-sm text-muted-foreground">{serverName}</span>
      </div>
      <div className="flex items-center gap-2">
        {(userRole === 'owner' || userRole === 'manager') && (
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <LayoutDashboard className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-1" />
          Logout
        </Button>
      </div>
    </div>
  );
}
