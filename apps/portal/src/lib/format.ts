/**
 * Convert cents to a formatted dollar string without symbol.
 * e.g. 1299 → "12.99"
 */
export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Convert cents to a formatted price string with dollar sign.
 * e.g. 1299 → "$12.99"
 */
export function formatPrice(cents: number): string {
  return `$${formatCents(cents)}`;
}
