import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractSubdomain } from './tenant';

// Mock the convex client to test resolveTenant
vi.mock('./auth/convex-client', () => ({
  convexClient: {
    query: vi.fn(),
  },
}));

vi.mock('@restaurantos/backend', () => ({
  api: {
    tenants: {
      queries: {
        getBySubdomain: 'tenants:queries:getBySubdomain',
        getTheme: 'tenants:queries:getTheme',
      },
    },
  },
}));

describe('extractSubdomain', () => {
  it('extracts subdomain from demo.localhost:3000', () => {
    expect(extractSubdomain('demo.localhost:3000')).toBe('demo');
  });

  it('returns null for localhost:3000', () => {
    expect(extractSubdomain('localhost:3000')).toBeNull();
  });

  it('extracts subdomain from demo.restaurantos.com', () => {
    expect(extractSubdomain('demo.restaurantos.com')).toBe('demo');
  });

  it('returns null for restaurantos.com', () => {
    expect(extractSubdomain('restaurantos.com')).toBeNull();
  });

  it('extracts subdomain from multi-part localhost', () => {
    expect(extractSubdomain('dk-soul-food.localhost:3006')).toBe('dk-soul-food');
  });

  it('returns null for bare localhost', () => {
    expect(extractSubdomain('localhost')).toBeNull();
  });

  it('extracts subdomain from multi-part domain', () => {
    expect(extractSubdomain('marias-kitchen.restaurants.irawatkins.com')).toBe('marias-kitchen');
  });

  it('returns null for two-part domain without localhost', () => {
    expect(extractSubdomain('example.com')).toBeNull();
  });
});

describe('resolveTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns tenant and theme for active tenant', async () => {
    const { convexClient } = await import('./auth/convex-client');
    const mockTenant = { _id: 'tenant123', status: 'active', name: 'Test' };
    const mockTheme = { primaryColor: '#000' };

    (convexClient.query as any)
      .mockResolvedValueOnce(mockTenant)
      .mockResolvedValueOnce(mockTheme);

    const { resolveTenant } = await import('./tenant');
    const result = await resolveTenant('demo');

    expect(result).toEqual({ tenant: mockTenant, theme: mockTheme });
    expect(convexClient.query).toHaveBeenCalledTimes(2);
  });

  it('returns null for non-existent tenant', async () => {
    const { convexClient } = await import('./auth/convex-client');
    (convexClient.query as any).mockResolvedValueOnce(null);

    const { resolveTenant } = await import('./tenant');
    const result = await resolveTenant('nonexistent');

    expect(result).toBeNull();
  });

  it('returns null for inactive tenant', async () => {
    const { convexClient } = await import('./auth/convex-client');
    const mockTenant = { _id: 'tenant123', status: 'suspended', name: 'Test' };
    (convexClient.query as any).mockResolvedValueOnce(mockTenant);

    const { resolveTenant } = await import('./tenant');
    const result = await resolveTenant('suspended-tenant');

    expect(result).toBeNull();
  });
});
