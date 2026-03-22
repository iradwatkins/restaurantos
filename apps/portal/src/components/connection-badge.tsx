'use client';

import { useOnlineStatus, type ConnectionState } from '@/hooks/use-online-status';
import { cn } from '@restaurantos/ui';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

const STATE_CONFIG: Record<ConnectionState, {
  dotColor: string;
  label: string;
  icon: React.ElementType;
  textColor: string;
  bgColor: string;
  animate: boolean;
}> = {
  online: {
    dotColor: 'bg-green-500',
    label: 'Online',
    icon: Wifi,
    textColor: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    animate: false,
  },
  offline: {
    dotColor: 'bg-red-500',
    label: 'Offline',
    icon: WifiOff,
    textColor: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    animate: false,
  },
  syncing: {
    dotColor: 'bg-yellow-500',
    label: 'Syncing',
    icon: RefreshCw,
    textColor: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    animate: true,
  },
};

/**
 * Connection status indicator for the POS header.
 * Shows Online (green), Offline (red), or Syncing (yellow) with pending count.
 */
export function ConnectionBadge() {
  const { connectionState, pendingCount } = useOnlineStatus();
  const config = STATE_CONFIG[connectionState];
  const Icon = config.icon;

  const label = connectionState === 'syncing' && pendingCount > 0
    ? `Syncing (${pendingCount} pending)`
    : config.label;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
        config.bgColor,
        config.textColor
      )}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${label}`}
    >
      {/* Animated dot */}
      <span className="relative flex h-2 w-2">
        {config.animate && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
              config.dotColor
            )}
          />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', config.dotColor)} />
      </span>

      <Icon className={cn('h-3 w-3', config.animate && 'animate-spin')} />
      <span>{label}</span>
    </div>
  );
}
