import { generateKeyPairSync, createPrivateKey, createPublicKey, KeyObject } from 'crypto';
import { exportJWK, type JWK } from 'jose';

const KEY_ID = 'restaurantos-portal-key-1';

let cachedPrivateKey: KeyObject | null = null;
let cachedPublicKey: KeyObject | null = null;
let cachedJwks: { keys: JWK[] } | null = null;

function getKeyPair(): { privateKey: KeyObject; publicKey: KeyObject } {
  if (cachedPrivateKey && cachedPublicKey) {
    return { privateKey: cachedPrivateKey, publicKey: cachedPublicKey };
  }

  const privateKeyPem = process.env.JWT_PRIVATE_KEY;
  const publicKeyPem = process.env.JWT_PUBLIC_KEY;

  if (privateKeyPem && publicKeyPem) {
    try {
      const decodedPrivate = Buffer.from(privateKeyPem, 'base64').toString('utf-8');
      const decodedPublic = Buffer.from(publicKeyPem, 'base64').toString('utf-8');
      cachedPrivateKey = createPrivateKey(decodedPrivate);
      cachedPublicKey = createPublicKey(decodedPublic);
    } catch (error) {
      console.error('[JWKS] Failed to parse RSA keys:', error);
    }
  }

  if (!cachedPrivateKey || !cachedPublicKey) {
    console.warn(
      '[JWKS] WARNING: JWT_PRIVATE_KEY/JWT_PUBLIC_KEY not set. Using ephemeral keys that reset on restart.\n' +
      '  Run `scripts/generate-keypair.sh` and add the values to your .env file.'
    );

    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    cachedPrivateKey = createPrivateKey(privateKey);
    cachedPublicKey = createPublicKey(publicKey);
  }

  return { privateKey: cachedPrivateKey, publicKey: cachedPublicKey };
}

export async function getPrivateKey(): Promise<KeyObject> {
  return getKeyPair().privateKey;
}

export async function getJwks(): Promise<{ keys: JWK[] }> {
  if (cachedJwks) return cachedJwks;

  const { publicKey } = getKeyPair();
  const jwk = await exportJWK(publicKey);
  jwk.kid = KEY_ID;
  jwk.alg = 'RS256';
  jwk.use = 'sig';

  cachedJwks = { keys: [jwk] };
  return cachedJwks;
}

export function getKeyId(): string {
  return KEY_ID;
}
