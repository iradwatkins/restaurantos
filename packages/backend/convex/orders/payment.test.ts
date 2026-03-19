import { describe, it, expect } from 'vitest';

/**
 * Tests for payment status calculation logic used when determining
 * whether an order is fully paid, partially paid, or overpaid.
 */

function calculatePaymentStatus(
  orderTotal: number,
  payments: { amount: number }[]
): 'paid' | 'partial' {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  return totalPaid >= orderTotal ? 'paid' : 'partial';
}

describe('payment status calculation', () => {
  it('returns "paid" when total payments >= order total', () => {
    expect(calculatePaymentStatus(5000, [{ amount: 5000 }])).toBe('paid');
  });

  it('returns "partial" when total payments < order total', () => {
    expect(calculatePaymentStatus(5000, [{ amount: 2500 }])).toBe('partial');
  });

  it('handles multiple split payments correctly', () => {
    expect(
      calculatePaymentStatus(5000, [{ amount: 2500 }, { amount: 2500 }])
    ).toBe('paid');
  });

  it('handles overpayment (tip included in amount)', () => {
    expect(calculatePaymentStatus(5000, [{ amount: 6000 }])).toBe('paid');
  });

  it('returns "partial" when no payments exist', () => {
    expect(calculatePaymentStatus(5000, [])).toBe('partial');
  });

  it('handles many small split payments', () => {
    const payments = Array.from({ length: 10 }, () => ({ amount: 500 }));
    expect(calculatePaymentStatus(5000, payments)).toBe('paid');
  });

  it('handles single cent short of full payment', () => {
    expect(calculatePaymentStatus(5000, [{ amount: 4999 }])).toBe('partial');
  });
});
