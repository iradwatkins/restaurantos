interface OrderForReport {
  source: string;
  total: number;
  items: { name: string; quantity: number; lineTotal: number }[];
}

/**
 * Aggregate revenue and count by order source.
 */
export function aggregateSalesBySource(
  orders: OrderForReport[]
): Record<string, { revenue: number; count: number }> {
  const bySource: Record<string, { revenue: number; count: number }> = {};

  for (const order of orders) {
    const source = order.source;
    if (!bySource[source]) {
      bySource[source] = { revenue: 0, count: 0 };
    }
    bySource[source]!.revenue += order.total;
    bySource[source]!.count += 1;
  }

  return bySource;
}

/**
 * Aggregate top-selling items across orders, sorted by count descending.
 */
export function aggregateTopItems(
  orders: OrderForReport[],
  limit: number
): { name: string; count: number; revenue: number }[] {
  const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};

  for (const order of orders) {
    for (const item of order.items) {
      const key = item.name;
      if (!itemCounts[key]) {
        itemCounts[key] = { name: item.name, count: 0, revenue: 0 };
      }
      itemCounts[key]!.count += item.quantity;
      itemCounts[key]!.revenue += item.lineTotal;
    }
  }

  return Object.values(itemCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
