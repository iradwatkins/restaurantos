/**
 * Payment provider abstraction layer for RestaurantOS.
 *
 * Supports multiple payment processors (Stripe, Square) behind a uniform
 * interface so tenant payment logic is decoupled from any single vendor.
 */

export interface Reader {
  id: string;
  label: string;
  status: 'online' | 'offline';
  deviceType: string;
  serialNumber: string;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

export interface CapturePaymentResult {
  status: string;
}

export interface RefundPaymentResult {
  refundId: string;
}

export interface ConnectionTokenResult {
  secret: string;
}

export interface PaymentProvider {
  /** Human-readable provider name (e.g. "stripe", "square") */
  readonly name: string;

  // ── Terminal / Reader Management ──────────────────────────────

  /** Create a connection token for the terminal SDK to authenticate readers */
  createConnectionToken(): Promise<ConnectionTokenResult>;

  /** List all registered terminal readers */
  listReaders(): Promise<Reader[]>;

  // ── Payment Processing ───────────────────────────────────────

  /** Create a payment intent for a card-present terminal transaction */
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<CreatePaymentIntentResult>;

  /** Capture a previously authorized payment */
  capturePayment(paymentIntentId: string): Promise<CapturePaymentResult>;

  /** Cancel a payment intent that has not yet been captured */
  cancelPayment(paymentIntentId: string): Promise<void>;

  /** Refund a captured payment. If amount is omitted, full refund is issued. */
  refundPayment(paymentIntentId: string, amount?: number): Promise<RefundPaymentResult>;
}
