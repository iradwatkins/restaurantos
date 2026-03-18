import { query } from "../_generated/server";
import { v } from "convex/values";

export const getDailySales = query({
  args: { tenantId: v.id("tenants"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const numDays = args.days ?? 7;
    const now = new Date();

    const dailyData = [];

    for (let i = 0; i < numDays; i++) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const orders = await ctx.db
        .query("orders")
        .withIndex("by_tenantId_createdAt", (q) =>
          q
            .eq("tenantId", args.tenantId)
            .gte("createdAt", dayStart.getTime())
        )
        .collect();

      // Filter to this day and completed/paid orders
      const dayOrders = orders.filter(
        (o) =>
          o.createdAt < dayEnd.getTime() &&
          (o.paymentStatus === "paid" || o.source !== "dine_in")
      );

      // Break down by source
      const bySource: Record<string, { revenue: number; count: number }> = {};
      for (const order of dayOrders) {
        const source = order.source;
        if (!bySource[source]) {
          bySource[source] = { revenue: 0, count: 0 };
        }
        bySource[source]!.revenue += order.total;
        bySource[source]!.count += 1;
      }

      dailyData.push({
        date: dayStart.toISOString().split("T")[0],
        totalRevenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
        orderCount: dayOrders.length,
        bySource,
      });
    }

    return dailyData;
  },
});

export const getTopItems = query({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
    startDate: v.optional(v.number()), // epoch ms
    endDate: v.optional(v.number()), // epoch ms
  },
  handler: async (ctx, args) => {
    const maxItems = args.limit ?? 10;

    let fromTime: number;
    if (args.startDate) {
      fromTime = args.startDate;
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      fromTime = today.getTime();
    }

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_tenantId_createdAt", (q) =>
        q.eq("tenantId", args.tenantId).gte("createdAt", fromTime)
      )
      .collect();

    // Filter by end date if provided
    const filtered = args.endDate
      ? orders.filter((o) => o.createdAt <= args.endDate!)
      : orders;

    // Count item sales
    const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const order of filtered) {
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
      .slice(0, maxItems);
  },
});
