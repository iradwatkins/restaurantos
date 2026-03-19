import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock stripe module — must be a class since route uses `new Stripe(...)`
const mockConstructEvent = vi.fn();
vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      webhooks = { constructEvent: mockConstructEvent };
    },
  };
});

// Mock ConvexHttpClient
const mockMutation = vi.fn();
vi.mock('convex/browser', () => ({
  ConvexHttpClient: class MockConvexHttpClient {
    mutation = mockMutation;
  },
}));

// Mock logger
const mockLoggerWarn = vi.fn();
const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: (...args: any[]) => mockLoggerWarn(...args),
    info: (...args: any[]) => mockLoggerInfo(...args),
    error: (...args: any[]) => mockLoggerError(...args),
  },
}));

vi.mock('@restaurantos/backend', () => ({
  api: {
    orders: {
      mutations: {
        recordPayment: 'orders:mutations:recordPayment',
      },
    },
  },
}));

// Must import after mocks
const { POST } = await import('./route');

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body,
    headers,
  });
}

describe('Stripe webhook handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signature verification', () => {
    it('returns 400 when stripe-signature header is missing', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
      vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_123');

      const response = await POST(makeRequest('{}'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing signature');

      vi.unstubAllEnvs();
    });

    it('returns 503 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', '');
      vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');

      const response = await POST(
        makeRequest('{}', { 'stripe-signature': 'sig_test' })
      );
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Stripe not configured');

      vi.unstubAllEnvs();
    });

    it('returns 400 when signature verification fails', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
      vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_123');
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await POST(
        makeRequest('{}', { 'stripe-signature': 'bad_sig' })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid signature');

      vi.unstubAllEnvs();
    });
  });

  describe('payment_intent.succeeded', () => {
    beforeEach(() => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
      vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_123');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('calls recordPayment with correct tenantId, orderId, and amount', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 5000,
            metadata: { tenantId: 'tenant_1', orderId: 'order_1' },
            latest_charge: 'ch_test_123',
          },
        },
      });
      mockMutation.mockResolvedValue(undefined);

      const response = await POST(
        makeRequest('{}', { 'stripe-signature': 'valid_sig' })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockMutation).toHaveBeenCalledWith(
        'orders:mutations:recordPayment',
        {
          tenantId: 'tenant_1',
          orderId: 'order_1',
          amount: 5000,
          method: 'card',
          stripePaymentIntentId: 'pi_test_123',
          stripeChargeId: 'ch_test_123',
        }
      );
    });

    it('handles missing metadata gracefully', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_no_meta',
            amount: 3000,
            metadata: {},
            latest_charge: null,
          },
        },
      });

      const response = await POST(
        makeRequest('{}', { 'stripe-signature': 'valid_sig' })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockMutation).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.objectContaining({ paymentIntentId: 'pi_no_meta' }),
        expect.stringContaining('without order metadata')
      );
    });
  });

  describe('charge.refunded', () => {
    it('logs refund event with payment intent ID', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
      vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_123');
      mockConstructEvent.mockReturnValue({
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_refund_123',
            payment_intent: 'pi_original_123',
            amount_refunded: 2500,
          },
        },
      });

      const response = await POST(
        makeRequest('{}', { 'stripe-signature': 'valid_sig' })
      );

      expect(response.status).toBe(200);
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.objectContaining({ paymentIntentId: 'pi_original_123' }),
        expect.stringContaining('refunded')
      );
      vi.unstubAllEnvs();
    });
  });

  describe('unhandled event types', () => {
    it('returns 200 for unrecognized event types', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
      vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_123');

      mockConstructEvent.mockReturnValue({
        type: 'some.unknown.event',
        data: { object: {} },
      });

      const response = await POST(
        makeRequest('{}', { 'stripe-signature': 'valid_sig' })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      vi.unstubAllEnvs();
    });
  });
});
