import Stripe from 'stripe';
import type {
  PaymentProvider,
  Reader,
  CreatePaymentIntentParams,
  CreatePaymentIntentResult,
  CapturePaymentResult,
  RefundPaymentResult,
  ConnectionTokenResult,
} from './types';

export interface StripeTerminalProviderConfig {
  /** Stripe secret key (sk_live_... or sk_test_...) */
  secretKey: string;
  /** Optional Stripe Terminal location ID for reader filtering */
  locationId?: string;
}

export class StripeTerminalProvider implements PaymentProvider {
  readonly name = 'stripe' as const;
  private readonly stripe: Stripe;
  private readonly locationId: string | undefined;

  constructor(config: StripeTerminalProviderConfig) {
    if (!config.secretKey) {
      throw new Error('StripeTerminalProvider: secretKey is required');
    }
    this.stripe = new Stripe(config.secretKey);
    this.locationId = config.locationId;
  }

  async createConnectionToken(): Promise<ConnectionTokenResult> {
    const params: Stripe.Terminal.ConnectionTokenCreateParams = {};
    if (this.locationId) {
      params.location = this.locationId;
    }
    const token = await this.stripe.terminal.connectionTokens.create(params);
    return { secret: token.secret };
  }

  async listReaders(): Promise<Reader[]> {
    const params: Stripe.Terminal.ReaderListParams = { limit: 100 };
    if (this.locationId) {
      params.location = this.locationId;
    }
    const response = await this.stripe.terminal.readers.list(params);

    return response.data.map((reader) => ({
      id: reader.id,
      label: reader.label ?? reader.id,
      status: reader.status === 'online' ? 'online' : 'offline',
      deviceType: reader.device_type,
      serialNumber: reader.serial_number,
    }));
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<CreatePaymentIntentResult> {
    if (params.amount < 50) {
      throw new Error('Amount must be at least 50 cents ($0.50)');
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      payment_method_types: ['card_present'],
      capture_method: 'manual',
      metadata: params.metadata ?? {},
    });

    if (!paymentIntent.client_secret) {
      throw new Error('Stripe did not return a client secret for the payment intent');
    }

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  async capturePayment(paymentIntentId: string): Promise<CapturePaymentResult> {
    const captured = await this.stripe.paymentIntents.capture(paymentIntentId);
    return { status: captured.status };
  }

  async cancelPayment(paymentIntentId: string): Promise<void> {
    await this.stripe.paymentIntents.cancel(paymentIntentId);
  }

  async refundPayment(paymentIntentId: string, amount?: number): Promise<RefundPaymentResult> {
    const params: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };
    if (amount !== undefined) {
      params.amount = amount;
    }
    const refund = await this.stripe.refunds.create(params);
    return { refundId: refund.id };
  }
}
