import { describe, it, expect } from 'vitest';
import { formatCents, formatPrice } from './format';

describe('formatCents', () => {
  it('formats zero cents', () => {
    expect(formatCents(0)).toBe('0.00');
  });

  it('formats whole dollar amounts', () => {
    expect(formatCents(1000)).toBe('10.00');
  });

  it('formats cents with decimals', () => {
    expect(formatCents(1299)).toBe('12.99');
  });

  it('formats single cent', () => {
    expect(formatCents(1)).toBe('0.01');
  });

  it('formats large amounts', () => {
    expect(formatCents(999999)).toBe('9999.99');
  });
});

describe('formatPrice', () => {
  it('prepends dollar sign', () => {
    expect(formatPrice(1299)).toBe('$12.99');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });
});
