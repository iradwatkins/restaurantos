import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock stripe — must be a class since route uses `new Stripe(...)`
const mockCreate = vi.fn();
vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      paymentIntents = { create: mockCreate };
    },
  };
});

// Mock ConvexHttpClient
const mockQuery = vi.fn();
vi.mock('convex/browser', () => ({
  ConvexHttpClient: class MockConvexHttpClient {
    query = mockQuery;
  },
}));

vi.mock('@restaurantos/backend', () => ({
  api: {
    orders: {
      queries: {
        getById: 'orders:queries:getById',
      },
    },
  },
}));

// Mock rate-limit to always allow (tested separately)
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ success: true, remaining: 9, resetMs: 60000 })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

// Mock logger (pino is not available in test environment)
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const { POST } = await import('./route');

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/stripe/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('create-payment-intent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
    vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', 'https://convex.test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('configuration', () => {
    it('returns 503 when STRIPE_SECRET_KEY is not set', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', '');

      const response = await POST(
        makeRequest({ amount: 5000, metadata: { tenantId: 't1' } })
      );
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toContain('not configured');
    });
  });

  describe('amount validation', () => {
    it('rejects amounts below minimum (50 cents)', async () => {
      const response = await POST(
        makeRequest({ amount: 30, metadata: { tenantId: 't1' } })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('at least $0.50');
    });

    it('rejects zero amount', async () => {
      const response = await POST(
        makeRequest({ amount: 0, metadata: { tenantId: 't1' } })
      );

      expect(response.status).toBe(400);
    });

    it('rejects amounts above maximum ($10,000)', async () => {
      const response = await POST(
        makeRequest({ amount: 1000001, metadata: { tenantId: 't1' } })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('cannot exceed');
    });

    it('accepts valid amounts within range', async () => {
      mockCreate.mockResolvedValue({
        client_secret: 'cs_test',
        id: 'pi_test',
      });

      const response = await POST(
        makeRequest({ amount: 5000, metadata: { tenantId: 't1' } })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.clientSecret).toBe('cs_test');
      expect(data.paymentIntentId).toBe('pi_test');
    });

    it('accepts the minimum amount (50 cents)', async () => {
      mockCreate.mockResolvedValue({ client_secret: 'cs_test', id: 'pi_test' });

      const response = await POST(
        makeRequest({ amount: 50, metadata: { tenantId: 't1' } })
      );

      expect(response.status).toBe(200);
    });

    it('accepts the maximum amount ($10,000)', async () => {
      mockCreate.mockResolvedValue({ client_secret: 'cs_test', id: 'pi_test' });

      const response = await POST(
        makeRequest({ amount: 1000000, metadata: { tenantId: 't1' } })
      );

      expect(response.status).toBe(200);
    });
  });

  describe('metadata validation', () => {
    it('rejects requests without tenantId in metadata', async () => {
      const response = await POST(
        makeRequest({ amount: 5000, metadata: {} })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('tenantId');
    });
  });

  describe('server-side amount verification', () => {
    it('uses order total from database instead of client amount when they differ', async () => {
      mockQuery.mockResolvedValue({ total: 5000 });
      mockCreate.mockResolvedValue({ client_secret: 'cs_test', id: 'pi_test' });

      await POST(
        makeRequest({
          amount: 100,
          metadata: { tenantId: 't1', orderId: 'order_1' },
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 5000 })
      );
    });

    it('uses client amount when it matches order total', async () => {
      mockQuery.mockResolvedValue({ total: 5000 });
      mockCreate.mockResolvedValue({ client_secret: 'cs_test', id: 'pi_test' });

      await POST(
        makeRequest({
          amount: 5000,
          metadata: { tenantId: 't1', orderId: 'order_1' },
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 5000 })
      );
    });

    it('returns 500 when order amount verification fails', async () => {
      mockQuery.mockRejectedValue(new Error('DB error'));

      const response = await POST(
        makeRequest({
          amount: 5000,
          metadata: { tenantId: 't1', orderId: 'order_1' },
        })
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('verify order amount');
    });
  });
});
