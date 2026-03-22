export function getJwtSecretEncoded(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET or AUTH_SECRET environment variable must be set. ' +
      'The application cannot start without a secure signing key.'
    );
  }
  return new TextEncoder().encode(secret);
}

export function validateJwtSecret(): { valid: boolean; error?: string } {
  if (!process.env.JWT_SECRET && !process.env.AUTH_SECRET) {
    return { valid: false, error: 'JWT_SECRET or AUTH_SECRET must be set' };
  }
  return { valid: true };
}
