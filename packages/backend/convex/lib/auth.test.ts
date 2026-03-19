import { describe, it, expect, vi } from 'vitest';
import {
  getCurrentUser,
  getCurrentAdminUser,
  requireSuperAdmin,
  getCurrentUserOrNull,
} from './auth';

/**
 * Create a mock ctx for auth functions.
 * - identity: the value getUserIdentity() resolves to (null = unauthenticated)
 * - userResult: the value the db query .first() resolves to for the "users" table
 * - adminResult: the value the db query .first() resolves to for the "adminUsers" table
 */
function createMockCtx(
  identity: any | null,
  options: { userResult?: any; adminResult?: any } = {}
) {
  const firstFn = vi.fn();
  const withIndexFn = vi.fn().mockReturnValue({ first: firstFn });
  const queryFn = vi.fn().mockImplementation((table: string) => {
    if (table === 'adminUsers') {
      const adminFirst = vi.fn().mockResolvedValue(options.adminResult ?? null);
      const adminWithIndex = vi.fn().mockReturnValue({ first: adminFirst });
      return { withIndex: adminWithIndex };
    }
    // "users" table (default)
    firstFn.mockResolvedValue(options.userResult ?? null);
    return { withIndex: withIndexFn };
  });

  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue(identity),
    },
    db: {
      query: queryFn,
    },
    _mocks: { queryFn, withIndexFn, firstFn },
  } as any;
}

// ---------------------------------------------------------------------------
// getCurrentUser
// ---------------------------------------------------------------------------
describe('getCurrentUser', () => {
  it('throws when not authenticated (no identity)', async () => {
    const ctx = createMockCtx(null);
    await expect(getCurrentUser(ctx)).rejects.toThrow('Not authenticated');
  });

  it('extracts email from identity.email field', async () => {
    const user = { _id: 'u1', email: 'alice@test.com', tenantId: 't1' };
    const ctx = createMockCtx(
      { email: 'alice@test.com', tokenIdentifier: 'test|alice@test.com' },
      { userResult: user }
    );
    const result = await getCurrentUser(ctx);
    expect(result).toEqual(user);
  });

  it('extracts email from tokenIdentifier when email missing', async () => {
    const user = { _id: 'u1', email: 'bob@test.com', tenantId: 't1' };
    const ctx = createMockCtx(
      { tokenIdentifier: 'provider|bob@test.com' },
      { userResult: user }
    );
    const result = await getCurrentUser(ctx);
    expect(result).toEqual(user);
  });

  it('extracts email from subject when email and tokenIdentifier missing', async () => {
    const user = { _id: 'u1', email: 'carol@test.com', tenantId: 't1' };
    const ctx = createMockCtx(
      { subject: 'carol@test.com', tokenIdentifier: 'noemail' },
      { userResult: user }
    );
    const result = await getCurrentUser(ctx);
    expect(result).toEqual(user);
  });

  it('throws when no email can be extracted', async () => {
    const ctx = createMockCtx({
      tokenIdentifier: 'noemail',
      subject: 'no-email-here',
    });
    await expect(getCurrentUser(ctx)).rejects.toThrow(
      'No email found in auth token'
    );
  });

  it('uses by_tenantId_email index when tenantId present', async () => {
    const user = { _id: 'u1', email: 'alice@test.com', tenantId: 't1' };

    // Build a ctx that tracks which index was used
    const tenantFirst = vi.fn().mockResolvedValue(user);
    const tenantWithIndex = vi.fn().mockReturnValue({ first: tenantFirst });
    const fallbackFirst = vi.fn().mockResolvedValue(null);
    const fallbackWithIndex = vi.fn().mockReturnValue({ first: fallbackFirst });

    let callCount = 0;
    const ctx = {
      auth: {
        getUserIdentity: vi.fn().mockResolvedValue({
          email: 'alice@test.com',
          tenantId: 't1',
          tokenIdentifier: 'test|alice@test.com',
        }),
      },
      db: {
        query: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return { withIndex: tenantWithIndex };
          }
          return { withIndex: fallbackWithIndex };
        }),
      },
    } as any;

    const result = await getCurrentUser(ctx);
    expect(result).toEqual(user);
    expect(tenantWithIndex).toHaveBeenCalledWith(
      'by_tenantId_email',
      expect.any(Function)
    );
    // Should not have needed the fallback
    expect(fallbackFirst).not.toHaveBeenCalled();
  });

  it('falls back to by_email when tenantId missing', async () => {
    const user = { _id: 'u1', email: 'alice@test.com', tenantId: 't1' };
    const withIndexFn = vi.fn().mockReturnValue({
      first: vi.fn().mockResolvedValue(user),
    });
    const ctx = {
      auth: {
        getUserIdentity: vi.fn().mockResolvedValue({
          email: 'alice@test.com',
          tokenIdentifier: 'test|alice@test.com',
          // no tenantId
        }),
      },
      db: {
        query: vi.fn().mockReturnValue({ withIndex: withIndexFn }),
      },
    } as any;

    const result = await getCurrentUser(ctx);
    expect(result).toEqual(user);
    expect(withIndexFn).toHaveBeenCalledWith('by_email', expect.any(Function));
  });

  it('throws when user not found in database', async () => {
    const ctx = createMockCtx(
      { email: 'ghost@test.com', tokenIdentifier: 'test|ghost@test.com' },
      { userResult: null }
    );
    await expect(getCurrentUser(ctx)).rejects.toThrow('User not found');
  });
});

// ---------------------------------------------------------------------------
// getCurrentAdminUser
// ---------------------------------------------------------------------------
describe('getCurrentAdminUser', () => {
  it('throws when not authenticated', async () => {
    const ctx = createMockCtx(null);
    await expect(getCurrentAdminUser(ctx)).rejects.toThrow('Not authenticated');
  });

  it('returns admin user when found', async () => {
    const admin = { _id: 'a1', email: 'admin@test.com', role: 'super_admin' };
    const ctx = createMockCtx(
      { email: 'admin@test.com', tokenIdentifier: 'test|admin@test.com' },
      { adminResult: admin }
    );
    const result = await getCurrentAdminUser(ctx);
    expect(result).toEqual(admin);
  });

  it('throws when admin user not found', async () => {
    const ctx = createMockCtx(
      { email: 'nobody@test.com', tokenIdentifier: 'test|nobody@test.com' },
      { adminResult: null }
    );
    await expect(getCurrentAdminUser(ctx)).rejects.toThrow(
      'Admin user not found'
    );
  });
});

// ---------------------------------------------------------------------------
// requireSuperAdmin
// ---------------------------------------------------------------------------
describe('requireSuperAdmin', () => {
  it('throws when user role is not super_admin', async () => {
    const admin = { _id: 'a1', email: 'admin@test.com', role: 'admin' };
    const ctx = createMockCtx(
      { email: 'admin@test.com', tokenIdentifier: 'test|admin@test.com' },
      { adminResult: admin }
    );
    await expect(requireSuperAdmin(ctx)).rejects.toThrow(
      'Super admin access required'
    );
  });

  it('returns user when role is super_admin', async () => {
    const admin = { _id: 'a1', email: 'admin@test.com', role: 'super_admin' };
    const ctx = createMockCtx(
      { email: 'admin@test.com', tokenIdentifier: 'test|admin@test.com' },
      { adminResult: admin }
    );
    const result = await requireSuperAdmin(ctx);
    expect(result).toEqual(admin);
  });
});

// ---------------------------------------------------------------------------
// getCurrentUserOrNull
// ---------------------------------------------------------------------------
describe('getCurrentUserOrNull', () => {
  it('returns null when not authenticated', async () => {
    const ctx = createMockCtx(null);
    const result = await getCurrentUserOrNull(ctx);
    expect(result).toBeNull();
  });

  it('returns user when authenticated', async () => {
    const user = { _id: 'u1', email: 'alice@test.com', tenantId: 't1' };
    const ctx = createMockCtx(
      { email: 'alice@test.com', tokenIdentifier: 'test|alice@test.com' },
      { userResult: user }
    );
    const result = await getCurrentUserOrNull(ctx);
    expect(result).toEqual(user);
  });

  it('returns null when user not found in database', async () => {
    const ctx = createMockCtx(
      { email: 'ghost@test.com', tokenIdentifier: 'test|ghost@test.com' },
      { userResult: null }
    );
    const result = await getCurrentUserOrNull(ctx);
    expect(result).toBeNull();
  });
});
