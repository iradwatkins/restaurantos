/**
 * IndexedDB wrapper for offline caching.
 *
 * Stores:
 * - menuData: cached menu items, categories, modifiers, prices
 * - pendingOrders: orders created while offline, awaiting sync
 * - meta: key-value store for last sync timestamp, etc.
 */

const DB_NAME = 'restaurantos-offline';
const DB_VERSION = 1;

const STORE_MENU = 'menuData';
const STORE_PENDING_ORDERS = 'pendingOrders';
const STORE_META = 'meta';

// ────────────────────────────────────────────
// Database Connection
// ────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_MENU)) {
        db.createObjectStore(STORE_MENU, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(STORE_PENDING_ORDERS)) {
        const store = db.createObjectStore(STORE_PENDING_ORDERS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

// ────────────────────────────────────────────
// Generic IDB Helpers
// ────────────────────────────────────────────

function txReadOnly(storeName: string): Promise<{ store: IDBObjectStore; tx: IDBTransaction }> {
  return openDB().then((db) => {
    const tx = db.transaction(storeName, 'readonly');
    return { store: tx.objectStore(storeName), tx };
  });
}

function txReadWrite(storeName: string): Promise<{ store: IDBObjectStore; tx: IDBTransaction }> {
  return openDB().then((db) => {
    const tx = db.transaction(storeName, 'readwrite');
    return { store: tx.objectStore(storeName), tx };
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// ────────────────────────────────────────────
// Menu Data Cache
// ────────────────────────────────────────────

export interface CachedMenuItem {
  _id: string;
  name: string;
  price: number;
  categoryId?: string;
  type?: string;
  available?: boolean;
}

export interface CachedCategory {
  _id: string;
  name: string;
  sortOrder?: number;
}

export interface MenuCache {
  items: CachedMenuItem[];
  categories: CachedCategory[];
  cachedAt: number;
}

export async function saveMenuCache(data: MenuCache): Promise<void> {
  const { store, tx } = await txReadWrite(STORE_MENU);
  store.put({ key: 'menuCache', ...data });
  await txToPromise(tx);
}

export async function getMenuCache(): Promise<MenuCache | null> {
  const { store } = await txReadOnly(STORE_MENU);
  const result = await requestToPromise(store.get('menuCache'));
  if (!result) return null;
  return {
    items: result.items,
    categories: result.categories,
    cachedAt: result.cachedAt,
  };
}

export async function clearMenuCache(): Promise<void> {
  const { store, tx } = await txReadWrite(STORE_MENU);
  store.delete('menuCache');
  await txToPromise(tx);
}

// ────────────────────────────────────────────
// Pending Offline Orders
// ────────────────────────────────────────────

export type PendingOrderSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface PendingOrder {
  id?: number; // Auto-incremented by IndexedDB
  tenantId: string;
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  source: string;
  tableName?: string;
  tableId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  syncStatus: PendingOrderSyncStatus;
  syncError?: string;
  syncAttempts: number;
  createdAt: number;
  syncedAt?: number;
}

export async function savePendingOrder(order: Omit<PendingOrder, 'id'>): Promise<number> {
  const { store, tx } = await txReadWrite(STORE_PENDING_ORDERS);
  const request = store.add(order);
  const id = await requestToPromise(request);
  await txToPromise(tx);
  return id as number;
}

export async function getPendingOrders(): Promise<PendingOrder[]> {
  const { store } = await txReadOnly(STORE_PENDING_ORDERS);
  const result = await requestToPromise(store.getAll());
  return result ?? [];
}

export async function getUnsyncedOrders(): Promise<PendingOrder[]> {
  const { store } = await txReadOnly(STORE_PENDING_ORDERS);
  const index = store.index('syncStatus');
  const pending = await requestToPromise(index.getAll('pending'));
  const failed = await requestToPromise(index.getAll('failed'));
  return [...(pending ?? []), ...(failed ?? [])];
}

export async function updatePendingOrderStatus(
  id: number,
  status: PendingOrderSyncStatus,
  error?: string
): Promise<void> {
  const { store, tx } = await txReadWrite(STORE_PENDING_ORDERS);
  const existing = await requestToPromise(store.get(id));
  if (!existing) return;

  existing.syncStatus = status;
  existing.syncAttempts = (existing.syncAttempts ?? 0) + (status === 'syncing' ? 1 : 0);
  if (error) existing.syncError = error;
  if (status === 'synced') existing.syncedAt = Date.now();

  store.put(existing);
  await txToPromise(tx);
}

export async function removeSyncedOrders(): Promise<void> {
  const { store, tx } = await txReadWrite(STORE_PENDING_ORDERS);
  const index = store.index('syncStatus');
  const synced = await requestToPromise(index.getAll('synced'));
  for (const order of synced ?? []) {
    store.delete(order.id);
  }
  await txToPromise(tx);
}

export async function getPendingOrderCount(): Promise<number> {
  const orders = await getUnsyncedOrders();
  return orders.length;
}

// ────────────────────────────────────────────
// Meta Store (Last Sync, etc.)
// ────────────────────────────────────────────

export async function setMeta(key: string, value: unknown): Promise<void> {
  const { store, tx } = await txReadWrite(STORE_META);
  store.put({ key, value });
  await txToPromise(tx);
}

export async function getMeta<T = unknown>(key: string): Promise<T | null> {
  const { store } = await txReadOnly(STORE_META);
  const result = await requestToPromise(store.get(key));
  return result ? (result.value as T) : null;
}

export async function getLastSyncTimestamp(): Promise<number | null> {
  return getMeta<number>('lastSync');
}

export async function setLastSyncTimestamp(ts: number): Promise<void> {
  return setMeta('lastSync', ts);
}
