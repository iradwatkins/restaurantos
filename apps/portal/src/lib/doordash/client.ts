import { SignJWT } from 'jose';
import { logger } from '@/lib/logger';

const DOORDASH_BASE_URL = 'https://openapi.doordash.com';

interface DoordashCredentials {
  developerId: string;
  keyId: string;
  signingSecret: string;
}

interface DoordashAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

interface CreateDeliveryParams {
  externalDeliveryId: string;
  pickupAddress: DoordashAddress;
  pickupPhoneNumber: string;
  pickupBusinessName?: string;
  pickupInstructions?: string;
  dropoffAddress: DoordashAddress;
  dropoffPhoneNumber: string;
  dropoffContactGivenName?: string;
  dropoffInstructions?: string;
  pickupTime?: string; // ISO 8601
  orderValue: number; // cents
}

interface CreateQuoteParams {
  pickupAddress: DoordashAddress;
  dropoffAddress: DoordashAddress;
  pickupPhoneNumber?: string;
  dropoffPhoneNumber?: string;
  orderValue?: number; // cents
}

export interface DoordashDelivery {
  external_delivery_id: string;
  delivery_status: string;
  fee: number;
  currency: string;
  tracking_url: string;
  dasher_name?: string;
  dasher_phone_number?: string;
  estimated_pickup_time?: string;
  estimated_dropoff_time?: string;
  pickup_time_estimated?: string;
  dropoff_time_estimated?: string;
  actual_pickup_time?: string;
  actual_dropoff_time?: string;
  cancellation_reason?: string;
}

export interface DoordashQuote {
  external_delivery_id: string;
  fee: number;
  currency: string;
  estimated_pickup_time?: string;
  estimated_dropoff_time?: string;
  pickup_time_estimated?: string;
  dropoff_time_estimated?: string;
  delivery_status: string;
}

function formatAddress(addr: DoordashAddress): string {
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}`;
}

/**
 * Generate a DoorDash Drive JWT for API authentication.
 *
 * DoorDash requires a JWT signed with HS256 using the signing_secret.
 * Claims: aud=doordash, iss=developer_id, kid=key_id, exp=now+5min.
 */
async function generateDoordashJwt(credentials: DoordashCredentials): Promise<string> {
  // DoorDash signing secrets are base64-url encoded
  const decodedSecret = Buffer.from(credentials.signingSecret, 'base64');
  const secretKey = new Uint8Array(decodedSecret);

  const token = await new SignJWT({})
    .setProtectedHeader({
      alg: 'HS256',
      typ: 'JWT',
      kid: credentials.keyId,
      'dd-ver': 'DD-JWT-V1',
    })
    .setAudience('doordash')
    .setIssuer(credentials.developerId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secretKey);

  return token;
}

async function doordashFetch(
  credentials: DoordashCredentials,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const jwt = await generateDoordashJwt(credentials);

  const response = await fetch(`${DOORDASH_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      ...options.headers,
    },
  });

  return response;
}

async function handleDoordashResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.text();
    logger.error(
      { status: response.status, body: errorBody },
      'DoorDash API error'
    );
    throw new Error(
      `DoorDash API error (${response.status}): ${errorBody}`
    );
  }

  return response.json() as Promise<T>;
}

export class DoordashDriveClient {
  private credentials: DoordashCredentials;

  constructor(credentials: DoordashCredentials) {
    if (!credentials.developerId || !credentials.keyId || !credentials.signingSecret) {
      throw new Error('DoorDash credentials are incomplete');
    }
    this.credentials = credentials;
  }

  /**
   * Create a DoorDash Drive delivery.
   * POST /drive/v2/deliveries
   */
  async createDelivery(params: CreateDeliveryParams): Promise<DoordashDelivery> {
    const body = {
      external_delivery_id: params.externalDeliveryId,
      pickup_address: formatAddress(params.pickupAddress),
      pickup_phone_number: params.pickupPhoneNumber,
      pickup_business_name: params.pickupBusinessName,
      pickup_instructions: params.pickupInstructions,
      dropoff_address: formatAddress(params.dropoffAddress),
      dropoff_phone_number: params.dropoffPhoneNumber,
      dropoff_contact_given_name: params.dropoffContactGivenName,
      dropoff_instructions: params.dropoffInstructions,
      pickup_time: params.pickupTime,
      order_value: params.orderValue,
    };

    const response = await doordashFetch(
      this.credentials,
      '/drive/v2/deliveries',
      { method: 'POST', body: JSON.stringify(body) }
    );

    return handleDoordashResponse<DoordashDelivery>(response);
  }

  /**
   * Get delivery status.
   * GET /drive/v2/deliveries/{external_delivery_id}
   */
  async getDelivery(externalDeliveryId: string): Promise<DoordashDelivery> {
    const response = await doordashFetch(
      this.credentials,
      `/drive/v2/deliveries/${encodeURIComponent(externalDeliveryId)}`
    );

    return handleDoordashResponse<DoordashDelivery>(response);
  }

  /**
   * Cancel a DoorDash Drive delivery.
   * PUT /drive/v2/deliveries/{external_delivery_id}/cancel
   */
  async cancelDelivery(externalDeliveryId: string): Promise<DoordashDelivery> {
    const response = await doordashFetch(
      this.credentials,
      `/drive/v2/deliveries/${encodeURIComponent(externalDeliveryId)}/cancel`,
      { method: 'PUT' }
    );

    return handleDoordashResponse<DoordashDelivery>(response);
  }

  /**
   * Create a delivery quote (fee estimate before placing order).
   * POST /drive/v2/deliveries with pickup_time omitted signals a quote.
   *
   * DoorDash returns a quote object with fee, estimated times.
   * The external_delivery_id can later be used to convert the quote
   * into an actual delivery via createDelivery.
   */
  async createQuote(params: CreateQuoteParams): Promise<DoordashQuote> {
    const quoteId = `quote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const body = {
      external_delivery_id: quoteId,
      pickup_address: formatAddress(params.pickupAddress),
      pickup_phone_number: params.pickupPhoneNumber || '+10000000000',
      dropoff_address: formatAddress(params.dropoffAddress),
      dropoff_phone_number: params.dropoffPhoneNumber || '+10000000000',
      order_value: params.orderValue ?? 0,
    };

    const response = await doordashFetch(
      this.credentials,
      '/drive/v2/deliveries',
      { method: 'POST', body: JSON.stringify(body) }
    );

    return handleDoordashResponse<DoordashQuote>(response);
  }
}
