import { describe, it, expect } from 'vitest';
import { aggregateSalesBySource, aggregateTopItems } from './report-utils';

const mockOrders = [
  {
    source: 'dine_in',
    total: 2500,
    items: [
      { name: 'Burger', quantity: 2, lineTotal: 2000 },
      { name: 'Fries', quantity: 1, lineTotal: 500 },
    ],
  },
  {
    source: 'dine_in',
    total: 1200,
    items: [{ name: 'Salad', quantity: 1, lineTotal: 1200 }],
  },
  {
    source: 'online',
    total: 3000,
    items: [
      { name: 'Burger', quantity: 1, lineTotal: 1000 },
      { name: 'Fries', quantity: 2, lineTotal: 1000 },
      { name: 'Soda', quantity: 1, lineTotal: 1000 },
    ],
  },
];

describe('aggregateSalesBySource', () => {
  it('groups revenue and count by source', () => {
    const result = aggregateSalesBySource(mockOrders);

    expect(result).toEqual({
      dine_in: { revenue: 3700, count: 2 },
      online: { revenue: 3000, count: 1 },
    });
  });

  it('returns empty object for empty orders', () => {
    expect(aggregateSalesBySource([])).toEqual({});
  });
});

describe('aggregateTopItems', () => {
  it('aggregates item counts and revenue across orders', () => {
    const result = aggregateTopItems(mockOrders, 10);

    expect(result).toEqual([
      { name: 'Burger', count: 3, revenue: 3000 },
      { name: 'Fries', count: 3, revenue: 1500 },
      { name: 'Salad', count: 1, revenue: 1200 },
      { name: 'Soda', count: 1, revenue: 1000 },
    ]);
  });

  it('respects the limit parameter', () => {
    const result = aggregateTopItems(mockOrders, 2);

    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe('Burger');
    expect(result[1]!.name).toBe('Fries');
  });

  it('returns empty array for empty orders', () => {
    expect(aggregateTopItems([], 10)).toEqual([]);
  });
});
