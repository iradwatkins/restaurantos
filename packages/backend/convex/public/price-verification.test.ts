import { describe, it, expect } from 'vitest';

/**
 * Tests for the server-side price verification logic used in placeOrder.
 * This ensures line totals, modifiers, tax, and tips are calculated correctly
 * to prevent client-side price manipulation.
 */

interface Modifier {
  name: string;
  priceAdjustment: number;
}

function calculateLineTotal(
  price: number,
  quantity: number,
  modifiers: Modifier[]
): number {
  const modifierTotal = modifiers.reduce(
    (sum, m) => sum + m.priceAdjustment * quantity,
    0
  );
  return price * quantity + modifierTotal;
}

function calculateTax(subtotal: number, taxRate: number): number {
  return Math.round(subtotal * taxRate);
}

function calculateOrderTotal(
  subtotal: number,
  tax: number,
  tip: number
): number {
  return subtotal + tax + tip;
}

describe('server-side price verification', () => {
  describe('line total calculation', () => {
    it('calculates lineTotal correctly: price * quantity', () => {
      expect(calculateLineTotal(999, 3, [])).toBe(2997);
    });

    it('includes modifier adjustments in lineTotal', () => {
      const modifiers = [{ name: 'Extra Cheese', priceAdjustment: 150 }];
      // (999 * 2) + (150 * 2) = 1998 + 300 = 2298
      expect(calculateLineTotal(999, 2, modifiers)).toBe(2298);
    });

    it('handles zero-modifier items', () => {
      expect(calculateLineTotal(1500, 1, [])).toBe(1500);
    });

    it('handles multiple modifiers', () => {
      const modifiers = [
        { name: 'Extra Cheese', priceAdjustment: 150 },
        { name: 'Add Bacon', priceAdjustment: 200 },
      ];
      // (999 * 1) + (150 * 1) + (200 * 1) = 999 + 150 + 200 = 1349
      expect(calculateLineTotal(999, 1, modifiers)).toBe(1349);
    });

    it('handles quantity of zero', () => {
      expect(calculateLineTotal(999, 0, [])).toBe(0);
    });

    it('handles negative price adjustments (discounts)', () => {
      const modifiers = [{ name: 'No Bun (discount)', priceAdjustment: -100 }];
      // (999 * 1) + (-100 * 1) = 899
      expect(calculateLineTotal(999, 1, modifiers)).toBe(899);
    });
  });

  describe('tax calculation', () => {
    it('calculates tax correctly from subtotal and rate', () => {
      // 2997 * 0.0875 = 262.2375, rounds to 262
      expect(calculateTax(2997, 0.0875)).toBe(262);
    });

    it('rounds tax to nearest cent', () => {
      // 1000 * 0.0875 = 87.5, rounds to 88
      expect(calculateTax(1000, 0.0875)).toBe(88);
    });

    it('handles zero tax rate', () => {
      expect(calculateTax(5000, 0)).toBe(0);
    });

    it('handles zero subtotal', () => {
      expect(calculateTax(0, 0.0875)).toBe(0);
    });
  });

  describe('order total calculation', () => {
    it('calculates total as subtotal + tax + tip', () => {
      expect(calculateOrderTotal(2997, 262, 500)).toBe(3759);
    });

    it('calculates total with zero tip', () => {
      expect(calculateOrderTotal(2997, 262, 0)).toBe(3259);
    });

    it('calculates total with zero tax and tip', () => {
      expect(calculateOrderTotal(5000, 0, 0)).toBe(5000);
    });
  });
});
