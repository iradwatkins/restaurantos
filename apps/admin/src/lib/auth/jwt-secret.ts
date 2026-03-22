function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET or AUTH_SECRET environment variable must be set. ' +
      'Refusing to start with no secret configured.'
    );
  }
  return secret;
}

export function getJwtSecretEncoded(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

export function validateJwtSecret(): { valid: boolean; error?: string } {
  if (!process.env.JWT_SECRET && !process.env.AUTH_SECRET) {
    return { valid: false, error: 'JWT_SECRET or AUTH_SECRET must be set' };
  }
  return { valid: true };
}
