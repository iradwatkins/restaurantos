const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || 'dev-secret-change-me';

export function getJwtSecretEncoded(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

export function validateJwtSecret(): { valid: boolean; error?: string } {
  if (!process.env.JWT_SECRET && !process.env.AUTH_SECRET) {
    return { valid: false, error: 'JWT_SECRET or AUTH_SECRET must be set' };
  }
  return { valid: true };
}
