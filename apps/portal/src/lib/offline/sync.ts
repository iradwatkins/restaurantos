/**
 * Offline Sync Manager
 *
 * Handles syncing pending offline orders back to Convex when connectivity
 * is restored. Implements exponential backoff for failed syncs.
 */

import {
  getUnsyncedOrders,
  updatePendingOrderStatus,
  removeSyncedOrders,
  setLastSyncTimestamp,
  type PendingOrder,
} from './cache';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export type SyncState = 'idle' | 'syncing' | 'error';

export interface SyncStatus {
  state: SyncState;
  pendingCount: number;
  lastSyncAt: number | null;
  lastError: string | null;
}

type SyncCallback = (status: SyncStatus) => void;
type MutationFn = (order: PendingOrder) => Promise<void>;

// ────────────────────────────────────────────
// Exponential Backoff
// ────────────────────────────────────────────

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const MAX_RETRY_ATTEMPTS = 5;

function getBackoffDelay(attempt: number): number {
  const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
  // Add jitter: +/- 25%
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

// ────────────────────────────────────────────
// Sync Manager
// ────────────────────────────────────────────

let currentStatus: SyncStatus = {
  state: 'idle',
  pendingCount: 0,
  lastSyncAt: null,
  lastError: null,
};

const listeners: Set<SyncCallback> = new Set();
let syncInProgress = false;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;

function notify(): void {
  for (const cb of listeners) {
    try {
      cb({ ...currentStatus });
    } catch {
      // Listeners should not throw, but guard against it
    }
  }
}

function updateStatus(partial: Partial<SyncStatus>): void {
  currentStatus = { ...currentStatus, ...partial };
  notify();
}

/**
 * Subscribe to sync status changes.
 * Returns an unsubscribe function.
 */
export function onSyncStatusChange(callback: SyncCallback): () => void {
  listeners.add(callback);
  // Immediately emit current state
  callback({ ...currentStatus });
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Get the current sync status (snapshot).
 */
export function getSyncStatus(): SyncStatus {
  return { ...currentStatus };
}

/**
 * Attempt to sync all pending offline orders.
 * Uses the provided mutation function to send each order to Convex.
 *
 * @param syncOrder - An async function that sends one order to the backend.
 *                    Should throw on failure.
 */
export async function syncPendingOrders(syncOrder: MutationFn): Promise<void> {
  if (syncInProgress) return;
  if (!navigator.onLine) return;

  syncInProgress = true;

  try {
    const orders = await getUnsyncedOrders();
    if (orders.length === 0) {
      updateStatus({ state: 'idle', pendingCount: 0 });
      syncInProgress = false;
      return;
    }

    updateStatus({ state: 'syncing', pendingCount: orders.length, lastError: null });

    let failedCount = 0;

    for (const order of orders) {
      if (!navigator.onLine) {
        // Connection lost mid-sync; stop and schedule retry
        failedCount = orders.length - orders.indexOf(order);
        break;
      }

      if (order.syncAttempts >= MAX_RETRY_ATTEMPTS) {
        // Permanently failed — skip but keep in DB for manual review
        continue;
      }

      try {
        await updatePendingOrderStatus(order.id!, 'syncing');
        await syncOrder(order);
        await updatePendingOrderStatus(order.id!, 'synced');
      } catch (err: any) {
        failedCount++;
        const errorMsg = err?.message || 'Sync failed';
        await updatePendingOrderStatus(order.id!, 'failed', errorMsg);

        // Schedule retry with backoff
        const delay = getBackoffDelay(order.syncAttempts);
        scheduleRetry(syncOrder, delay);
      }
    }

    // Clean up synced orders
    await removeSyncedOrders();

    const remaining = await getUnsyncedOrders();
    const now = Date.now();
    await setLastSyncTimestamp(now);

    if (failedCount > 0) {
      updateStatus({
        state: 'error',
        pendingCount: remaining.length,
        lastSyncAt: now,
        lastError: `${failedCount} order${failedCount !== 1 ? 's' : ''} failed to sync`,
      });
    } else {
      updateStatus({
        state: 'idle',
        pendingCount: remaining.length,
        lastSyncAt: now,
        lastError: null,
      });
    }
  } catch (err: any) {
    updateStatus({
      state: 'error',
      lastError: err?.message || 'Sync failed unexpectedly',
    });
  } finally {
    syncInProgress = false;
  }
}

/**
 * Schedule a retry after a delay.
 */
function scheduleRetry(syncOrder: MutationFn, delayMs: number): void {
  if (retryTimeout) clearTimeout(retryTimeout);
  retryTimeout = setTimeout(() => {
    retryTimeout = null;
    syncPendingOrders(syncOrder);
  }, delayMs);
}

/**
 * Cancel any pending retry.
 */
export function cancelPendingRetry(): void {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
}

/**
 * Force an immediate sync attempt. Useful for manual "Sync Now" buttons.
 */
export async function forceSyncNow(syncOrder: MutationFn): Promise<void> {
  cancelPendingRetry();
  syncInProgress = false; // Allow re-entry
  await syncPendingOrders(syncOrder);
}

/**
 * Refresh the pending count without syncing (for UI display).
 */
export async function refreshPendingCount(): Promise<number> {
  const orders = await getUnsyncedOrders();
  updateStatus({ pendingCount: orders.length });
  return orders.length;
}
