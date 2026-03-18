import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';

// Extract the verification logic for testing
function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const sig = signature.replace(/^sha256=/, '');
  if (expected.length !== sig.length) return false;
  const { timingSafeEqual } = require('crypto');
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
}

describe('KitchenHub webhook signature verification', () => {
  const secret = 'test-webhook-secret-key';

  it('verifies a valid signature', () => {
    const body = JSON.stringify({ store_id: 'abc', platform: 'doordash' });
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
  });

  it('verifies a valid signature with sha256= prefix', () => {
    const body = JSON.stringify({ store_id: 'abc', platform: 'doordash' });
    const signature = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
  });

  it('rejects an invalid signature', () => {
    const body = JSON.stringify({ store_id: 'abc', platform: 'doordash' });
    const badSig = createHmac('sha256', 'wrong-secret').update(body).digest('hex');
    expect(verifyWebhookSignature(body, badSig, secret)).toBe(false);
  });

  it('rejects a tampered body', () => {
    const body = JSON.stringify({ store_id: 'abc', platform: 'doordash' });
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    const tampered = JSON.stringify({ store_id: 'abc', platform: 'ubereats' });
    expect(verifyWebhookSignature(tampered, signature, secret)).toBe(false);
  });

  it('rejects a signature with wrong length', () => {
    const body = 'test body';
    expect(verifyWebhookSignature(body, 'tooshort', secret)).toBe(false);
  });
});
