'use client';

import { useState, useEffect } from 'react';
import {
  onSyncStatusChange,
  refreshPendingCount,
  type SyncStatus,
} from '@/lib/offline/sync';

export type ConnectionState = 'online' | 'offline' | 'syncing';

export interface OnlineStatusResult {
  /** Whether the browser reports being online */
  isOnline: boolean;
  /** Derived connection state: online, offline, or syncing */
  connectionState: ConnectionState;
  /** Number of orders waiting to be synced */
  pendingCount: number;
  /** Full sync status from the sync manager */
  syncStatus: SyncStatus;
}

/**
 * Hook that tracks online/offline status and sync state.
 * Uses navigator.onLine and online/offline events for detection.
 * Subscribes to the sync manager for pending order counts.
 */
export function useOnlineStatus(): OnlineStatusResult {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'idle',
    pendingCount: 0,
    lastSyncAt: null,
    lastError: null,
  });

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to sync manager status
  useEffect(() => {
    const unsubscribe = onSyncStatusChange(setSyncStatus);
    // Refresh pending count on mount
    refreshPendingCount();
    return unsubscribe;
  }, []);

  const connectionState: ConnectionState = !isOnline
    ? 'offline'
    : syncStatus.state === 'syncing' || syncStatus.pendingCount > 0
      ? 'syncing'
      : 'online';

  return {
    isOnline,
    connectionState,
    pendingCount: syncStatus.pendingCount,
    syncStatus,
  };
}
