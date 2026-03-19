import { describe, it, expect, vi } from 'vitest';
import { requireTenantAccess, assertTenantOwnership } from './tenant-auth';

/**
 * Create a mock ctx that resolves getCurrentUser via the auth + db mocks.
 * getCurrentUser is called internally by requireTenantAccess, so we mock
 * ctx.auth.getUserIdentity() and ctx.db.query() the same way auth.test.ts does.
 */
function createMockCtx(
  identity: any | null,
  userResult: any | null = null
) {
  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue(identity),
    },
    db: {
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(userResult),
        }),
      }),
    },
  } as any;
}

// ---------------------------------------------------------------------------
// assertTenantOwnership (expanded from the original 3 tests)
// ---------------------------------------------------------------------------
describe('assertTenantOwnership', () => {
  it('throws "Not found" for null doc', () => {
    expect(() => assertTenantOwnership(null, 'tenant1')).toThrow('Not found');
  });

  it('throws "Forbidden" for mismatched tenant', () => {
    expect(() =>
      assertTenantOwnership({ tenantId: 'tenant2' }, 'tenant1')
    ).toThrow('Forbidden');
  });

  it('passes for matching tenant', () => {
    expect(() =>
      assertTenantOwnership({ tenantId: 'tenant1' }, 'tenant1')
    ).not.toThrow();
  });

  it('works with different document types that have tenantId', () => {
    // Order-like document
    const order = { tenantId: 'tenant1', orderNumber: 42, status: 'open' };
    expect(() => assertTenantOwnership(order, 'tenant1')).not.toThrow();

    // Menu-item-like document
    const menuItem = { tenantId: 'tenant1', name: 'Burger', price: 999 };
    expect(() => assertTenantOwnership(menuItem, 'tenant1')).not.toThrow();

    // Mismatched order
    expect(() => assertTenantOwnership(order, 'tenant_other')).toThrow(
      'Forbidden'
    );
  });
});

// ---------------------------------------------------------------------------
// requireTenantAccess
// ---------------------------------------------------------------------------
describe('requireTenantAccess', () => {
  it('throws when not authenticated', async () => {
    const ctx = createMockCtx(null);
    await expect(requireTenantAccess(ctx)).rejects.toThrow('Not authenticated');
  });

  it('throws when user has no tenantId', async () => {
    const user = { _id: 'u1', email: 'alice@test.com', tenantId: undefined };
    const ctx = createMockCtx(
      { email: 'alice@test.com', tokenIdentifier: 'test|alice@test.com' },
      user
    );
    await expect(requireTenantAccess(ctx)).rejects.toThrow(
      'Forbidden: user is not associated with a tenant'
    );
  });

  it('throws when user has empty string tenantId', async () => {
    const user = { _id: 'u1', email: 'alice@test.com', tenantId: '' };
    const ctx = createMockCtx(
      { email: 'alice@test.com', tokenIdentifier: 'test|alice@test.com' },
      user
    );
    await expect(requireTenantAccess(ctx)).rejects.toThrow(
      'Forbidden: user is not associated with a tenant'
    );
  });

  it('returns user with tenantId when present', async () => {
    const user = { _id: 'u1', email: 'alice@test.com', tenantId: 'tenant1' };
    const ctx = createMockCtx(
      { email: 'alice@test.com', tokenIdentifier: 'test|alice@test.com' },
      user
    );
    const result = await requireTenantAccess(ctx);
    expect(result).toEqual(user);
    expect(result.tenantId).toBe('tenant1');
  });
});
