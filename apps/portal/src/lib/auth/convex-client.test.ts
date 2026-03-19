import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockQuery = vi.fn();

vi.mock('convex/browser', () => ({
  ConvexHttpClient: class MockConvexHttpClient {
    url: string;
    query = mockQuery;
    mutation = vi.fn();
    action = vi.fn();
    constructor(url: string) {
      this.url = url;
    }
  },
}));

describe('convex-client', () => {
  const originalEnv = process.env.NEXT_PUBLIC_CONVEX_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test.convex.cloud';
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_CONVEX_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_CONVEX_URL;
    }
  });

  it('getConvexClient creates a client with the env URL', async () => {
    const { getConvexClient } = await import('./convex-client');
    const client = getConvexClient();
    expect(client).toBeDefined();
    expect((client as any).url).toBe('https://test.convex.cloud');
  });

  it('getConvexClient returns the same client on subsequent calls (singleton)', async () => {
    const { getConvexClient } = await import('./convex-client');
    const client1 = getConvexClient();
    const client2 = getConvexClient();
    expect(client1).toBe(client2);
  });

  it('convexClient proxy delegates to the underlying client', async () => {
    const { getConvexClient, convexClient } = await import('./convex-client');
    // Ensure client is initialized
    getConvexClient();
    // Proxy should delegate query (a function) as a bound function
    const queryFn = (convexClient as any).query;
    expect(typeof queryFn).toBe('function');
  });

  it('convexClient proxy returns non-function properties', async () => {
    const { getConvexClient, convexClient } = await import('./convex-client');
    getConvexClient();
    const url = (convexClient as any).url;
    expect(url).toBe('https://test.convex.cloud');
  });
});

describe('convex-client missing env', () => {
  it('getConvexClient throws when NEXT_PUBLIC_CONVEX_URL is not set', async () => {
    const savedUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    delete process.env.NEXT_PUBLIC_CONVEX_URL;

    vi.resetModules();

    vi.doMock('convex/browser', () => ({
      ConvexHttpClient: class {
        constructor() {
          // not reached
        }
      },
    }));

    const { getConvexClient } = await import('./convex-client');
    expect(() => getConvexClient()).toThrow('NEXT_PUBLIC_CONVEX_URL is not set');

    // Restore
    if (savedUrl !== undefined) {
      process.env.NEXT_PUBLIC_CONVEX_URL = savedUrl;
    }
  });
});
