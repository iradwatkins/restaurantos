import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify DoorDash webhook signature.
 *
 * DoorDash sends an HMAC-SHA256 signature in the `x-doordash-signature` header.
 * The signature is hex-encoded and may be prefixed with "sha256=".
 */
export function verifyDoordashWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const computed = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const sig = signature.replace(/^sha256=/, '');

  if (computed.length !== sig.length) return false;

  return timingSafeEqual(
    Buffer.from(computed, 'hex'),
    Buffer.from(sig, 'hex')
  );
}

/**
 * Map DoorDash delivery status to our internal delivery status.
 */
export function mapDoordashStatusToInternal(
  doordashStatus: string
): 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled' {
  switch (doordashStatus) {
    case 'created':
    case 'confirmed':
    case 'enroute_to_pickup':
      return 'pending';
    case 'arrived_at_pickup':
    case 'picked_up':
      return doordashStatus === 'picked_up' ? 'picked_up' : 'assigned';
    case 'enroute_to_dropoff':
    case 'arrived_at_dropoff':
      return 'picked_up';
    case 'delivered':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}
