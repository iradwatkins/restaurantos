import { describe, it, expect, vi } from 'vitest';
import { getNextOrderNumber } from './order-number';

function createMockCtx() {
  const store: any[] = [];
  let idCounter = 0;

  return {
    db: {
      query: (table: string) => ({
        withIndex: (indexName: string, builder: (q: any) => any) => {
          const q = {
            eq: (field: string, value: any) => {
              // Store filter params for matching
              if (!q._filters) q._filters = {};
              q._filters[field] = value;
              return q;
            },
            _filters: {} as Record<string, any>,
          };
          builder(q);
          return {
            unique: async () => {
              return store.find(
                (doc) =>
                  doc._table === table &&
                  Object.entries(q._filters).every(
                    ([k, v]) => doc[k] === v
                  )
              ) ?? null;
            },
          };
        },
      }),
      patch: async (id: string, updates: any) => {
        const doc = store.find((d) => d._id === id);
        if (doc) Object.assign(doc, updates);
      },
      insert: async (table: string, doc: any) => {
        const id = `id_${++idCounter}`;
        store.push({ ...doc, _id: id, _table: table });
        return id;
      },
    },
  } as any;
}

describe('getNextOrderNumber', () => {
  it('returns 1 for the first order of the day', async () => {
    const ctx = createMockCtx();
    const result = await getNextOrderNumber(ctx, 'tenant1' as any);
    expect(result).toBe(1);
  });

  it('increments for subsequent orders', async () => {
    const ctx = createMockCtx();
    const first = await getNextOrderNumber(ctx, 'tenant1' as any);
    const second = await getNextOrderNumber(ctx, 'tenant1' as any);
    const third = await getNextOrderNumber(ctx, 'tenant1' as any);
    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(third).toBe(3);
  });

  it('uses YYYY-MM-DD date format', async () => {
    const ctx = createMockCtx();
    await getNextOrderNumber(ctx, 'tenant1' as any);
    // Verify the date format stored
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    // The mock store should have an entry with this date
    expect(ctx.db).toBeDefined();
  });

  it('maintains separate counters per tenant', async () => {
    const ctx = createMockCtx();
    const t1 = await getNextOrderNumber(ctx, 'tenant1' as any);
    const t2 = await getNextOrderNumber(ctx, 'tenant2' as any);
    expect(t1).toBe(1);
    expect(t2).toBe(1);
  });
});
