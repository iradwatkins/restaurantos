import { SquareClient } from 'square';
import type { Currency } from 'square';
import type {
  PaymentProvider,
  Reader,
  CreatePaymentIntentParams,
  CreatePaymentIntentResult,
  CapturePaymentResult,
  RefundPaymentResult,
  ConnectionTokenResult,
} from './types';

export interface SquareTerminalProviderConfig {
  /** Square OAuth access token */
  accessToken: string;
  /** Square location ID for this restaurant */
  locationId: string;
  /** Square environment: 'sandbox' or 'production' */
  environment: 'sandbox' | 'production';
}

/**
 * Square Terminal payment provider implementation.
 *
 * Maps the PaymentProvider interface onto Square's Terminal API, which uses
 * a server-driven model (terminal checkouts) rather than client-side SDKs.
 *
 * Key differences from Stripe Terminal:
 * - Connection tokens → device codes (Square Terminal pairs via device codes)
 * - Payment intents → terminal checkouts (server creates checkout, device picks it up)
 * - Capture is automatic on Square — capturePayment becomes a status check
 * - Refunds use Square Refunds API (not Terminal Refunds, which is Interac-only in Canada)
 */
export class SquareTerminalProvider implements PaymentProvider {
  readonly name = 'square' as const;
  private readonly client: SquareClient;
  private readonly locationId: string;

  constructor(config: SquareTerminalProviderConfig) {
    if (!config.accessToken) {
      throw new Error('SquareTerminalProvider: accessToken is required');
    }
    if (!config.locationId) {
      throw new Error('SquareTerminalProvider: locationId is required');
    }
    if (!config.environment) {
      throw new Error('SquareTerminalProvider: environment is required');
    }

    this.client = new SquareClient({
      token: config.accessToken,
      environment: config.environment,
    });
    this.locationId = config.locationId;
  }

  /**
   * Create a device code for pairing a Square Terminal device.
   *
   * Square Terminal does not use connection tokens like Stripe. Instead,
   * a device code is generated that the merchant enters on the terminal
   * to pair it with their location. The returned `secret` is the device
   * code string.
   */
  async createConnectionToken(): Promise<ConnectionTokenResult> {
    const response = await this.client.devices.codes.create({
      idempotencyKey: crypto.randomUUID(),
      deviceCode: {
        productType: 'TERMINAL_API',
        locationId: this.locationId,
        name: `POS-${Date.now()}`,
      },
    });

    const code = response.deviceCode?.code;
    if (!code) {
      throw new Error('Square did not return a device code');
    }

    return { secret: code };
  }

  /**
   * List all terminal devices registered at this location.
   *
   * Uses the Square Devices API to retrieve devices, filtered to
   * the configured location.
   */
  async listReaders(): Promise<Reader[]> {
    const page = await this.client.devices.list({
      locationId: this.locationId,
    });

    const devices = page.data ?? [];

    return devices.map((device) => ({
      id: device.id ?? '',
      label: device.attributes?.name ?? device.id ?? 'Unknown Device',
      status:
        device.status?.category === 'AVAILABLE' ? 'online' as const : 'offline' as const,
      deviceType: device.attributes?.type ?? 'TERMINAL',
      serialNumber: device.attributes?.manufacturersId ?? '',
    }));
  }

  /**
   * Create a terminal checkout on Square.
   *
   * Unlike Stripe which returns a client secret for the JS SDK, Square's
   * terminal checkout is server-driven: the server creates a checkout and
   * the terminal device polls for and displays it automatically.
   *
   * The `clientSecret` field returns the checkout ID (used for status
   * polling), and `paymentIntentId` also returns the checkout ID for
   * consistency with the interface.
   */
  async createPaymentIntent(
    params: CreatePaymentIntentParams
  ): Promise<CreatePaymentIntentResult> {
    if (params.amount < 100) {
      throw new Error('Amount must be at least 100 cents ($1.00) for Square');
    }

    const deviceId = params.metadata?.deviceId;
    if (!deviceId) {
      throw new Error(
        'Square Terminal requires a deviceId in metadata to target a specific terminal'
      );
    }

    const response = await this.client.terminal.checkouts.create({
      idempotencyKey: crypto.randomUUID(),
      checkout: {
        amountMoney: {
          amount: BigInt(params.amount),
          currency: params.currency.toUpperCase() as Currency,
        },
        deviceOptions: {
          deviceId,
          skipReceiptScreen: false,
          collectSignature: false,
        },
        referenceId: params.metadata?.orderId,
        note: params.metadata?.orderId
          ? `Order ${params.metadata.orderId}`
          : undefined,
      },
    });

    const checkoutId = response.checkout?.id;
    if (!checkoutId) {
      throw new Error('Square did not return a checkout ID');
    }

    return {
      clientSecret: checkoutId,
      paymentIntentId: checkoutId,
    };
  }

  /**
   * Check the status of a terminal checkout.
   *
   * Square auto-captures payments on the terminal, so there is no separate
   * capture step. This method retrieves the checkout status and returns it.
   * Status values: PENDING, IN_PROGRESS, CANCEL_REQUESTED, CANCELED, COMPLETED.
   */
  async capturePayment(
    paymentIntentId: string
  ): Promise<CapturePaymentResult> {
    const response = await this.client.terminal.checkouts.get({
      checkoutId: paymentIntentId,
    });

    const status = response.checkout?.status;
    if (!status) {
      throw new Error('Square did not return checkout status');
    }

    return { status: status.toLowerCase() };
  }

  /**
   * Cancel a pending terminal checkout.
   *
   * Only checkouts in PENDING status can be cancelled. If the checkout
   * is already IN_PROGRESS on the device, cancellation may fail.
   */
  async cancelPayment(paymentIntentId: string): Promise<void> {
    await this.client.terminal.checkouts.cancel({
      checkoutId: paymentIntentId,
    });
  }

  /**
   * Refund a completed Square payment.
   *
   * Uses the Square Refunds API (not Terminal Refunds, which is
   * Interac-only for Canada). Requires the payment ID from the
   * completed checkout.
   *
   * If paymentIntentId is a checkout ID, we first retrieve the checkout
   * to get the underlying payment ID.
   */
  async refundPayment(
    paymentIntentId: string,
    amount?: number
  ): Promise<RefundPaymentResult> {
    // Resolve checkout ID to payment ID if needed
    let paymentId = paymentIntentId;

    // Attempt to resolve by fetching the checkout first — if the ID is
    // a checkout ID this yields the associated payment IDs.
    try {
      const checkoutResponse = await this.client.terminal.checkouts.get({
        checkoutId: paymentIntentId,
      });
      const resolvedPaymentId =
        checkoutResponse.checkout?.paymentIds?.[0];
      if (resolvedPaymentId) {
        paymentId = resolvedPaymentId;
      }
    } catch {
      // If it fails, assume paymentIntentId is already a payment ID
    }

    // Get the original payment to determine the full amount if not specified
    const paymentResponse = await this.client.payments.get({
      paymentId,
    });
    const originalAmount = paymentResponse.payment?.totalMoney?.amount;
    const currency =
      paymentResponse.payment?.totalMoney?.currency ?? ('USD' as Currency);

    const refundAmount =
      amount !== undefined ? BigInt(amount) : (originalAmount ?? BigInt(0));

    const refundResponse = await this.client.refunds.refundPayment({
      idempotencyKey: crypto.randomUUID(),
      paymentId,
      amountMoney: {
        amount: refundAmount,
        currency,
      },
      reason: 'Refund issued from POS',
    });

    const refundId = refundResponse.refund?.id;
    if (!refundId) {
      throw new Error('Square did not return a refund ID');
    }

    return { refundId };
  }
}
