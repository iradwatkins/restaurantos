import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";
import { Doc, Id } from "../_generated/dataModel";

// ── Shared helper: fetch orders in a date range for a tenant ──
async function fetchOrdersInRange(
  ctx: { db: any },
  tenantId: string,
  startDate: number,
  endDate: number
): Promise<Doc<"orders">[]> {
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_tenantId_createdAt", (q: any) =>
      q.eq("tenantId", tenantId).gte("createdAt", startDate)
    )
    .collect();

  return orders.filter(
    (o: Doc<"orders">) => o.createdAt <= endDate
  );
}

// ── Shared helper: filter to revenue-eligible orders ──
function revenueOrders(orders: Doc<"orders">[]): Doc<"orders">[] {
  return orders.filter(
    (o) => o.status !== "cancelled" && o.paymentStatus !== "refunded"
  );
}

// ============================================================
// 1. getDailySummary
// ============================================================
export const getDailySummary = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const allOrders = await fetchOrdersInRange(ctx, args.tenantId, args.startDate, args.endDate);
    const eligible = revenueOrders(allOrders);

    const totalOrders = eligible.length;
    const totalRevenue = eligible.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Orders by status
    const byStatus: Record<string, number> = {};
    for (const o of allOrders) {
      byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    }

    // Orders by source
    const bySource: Record<string, { count: number; revenue: number }> = {};
    for (const o of eligible) {
      if (!bySource[o.source]) {
        bySource[o.source] = { count: 0, revenue: 0 };
      }
      bySource[o.source]!.count += 1;
      bySource[o.source]!.revenue += o.total;
    }

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      byStatus,
      bySource,
    };
  },
});

// ============================================================
// 2. getHourlyHeatmap
// ============================================================
export const getHourlyHeatmap = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const eligible = revenueOrders(
      await fetchOrdersInRange(ctx, args.tenantId, args.startDate, args.endDate)
    );

    // Initialize all 24 hours
    const hours: Array<{ hour: number; count: number; revenue: number }> = [];
    for (let h = 0; h < 24; h++) {
      hours.push({ hour: h, count: 0, revenue: 0 });
    }

    for (const o of eligible) {
      const hour = new Date(o.createdAt).getHours();
      hours[hour]!.count += 1;
      hours[hour]!.revenue += o.total;
    }

    return hours;
  },
});

// ============================================================
// 3. getServerReport
// ============================================================
export const getServerReport = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const eligible = revenueOrders(
      await fetchOrdersInRange(ctx, args.tenantId, args.startDate, args.endDate)
    );

    const serverMap: Record<
      string,
      { serverId: string; name: string; orderCount: number; totalRevenue: number; totalTips: number }
    > = {};

    for (const o of eligible) {
      const sid = o.serverId;
      if (!sid) continue;
      const sidStr = sid as string;
      if (!serverMap[sidStr]) {
        serverMap[sidStr] = {
          serverId: sidStr,
          name: o.serverName ?? "Unknown",
          orderCount: 0,
          totalRevenue: 0,
          totalTips: 0,
        };
      }
      serverMap[sidStr]!.orderCount += 1;
      serverMap[sidStr]!.totalRevenue += o.total;
      serverMap[sidStr]!.totalTips += (o.tipAmount ?? o.tip ?? 0);
    }

    return Object.values(serverMap).map((s) => ({
      ...s,
      avgOrderValue: s.orderCount > 0 ? Math.round(s.totalRevenue / s.orderCount) : 0,
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  },
});

// ============================================================
// 4. getCategoryReport
// ============================================================
export const getCategoryReport = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const eligible = revenueOrders(
      await fetchOrdersInRange(ctx, args.tenantId, args.startDate, args.endDate)
    );

    // Collect all unique menuItemIds from order items
    const menuItemIds = new Set<Id<"menuItems">>();
    for (const o of eligible) {
      for (const item of o.items) {
        if (!item.isVoided) {
          menuItemIds.add(item.menuItemId);
        }
      }
    }

    // Look up menuItems to get their categoryId
    const menuItemCategoryMap = new Map<string, Id<"menuCategories">>();
    for (const id of menuItemIds) {
      const menuItem = await ctx.db.get(id);
      if (menuItem) {
        menuItemCategoryMap.set(id as string, menuItem.categoryId);
      }
    }

    // Look up categories
    const categoryIds = new Set(menuItemCategoryMap.values());
    const categoryNameMap = new Map<string, string>();
    for (const catId of categoryIds) {
      const cat = await ctx.db.get(catId);
      if (cat) {
        categoryNameMap.set(catId as string, cat.name);
      }
    }

    // Aggregate
    const catStats: Record<string, { categoryName: string; itemsSold: number; revenue: number }> = {};
    for (const o of eligible) {
      for (const item of o.items) {
        if (item.isVoided) continue;
        const catId = menuItemCategoryMap.get(item.menuItemId as string);
        if (!catId) continue;
        const catName = categoryNameMap.get(catId) ?? "Uncategorized";
        if (!catStats[catId]) {
          catStats[catId] = { categoryName: catName, itemsSold: 0, revenue: 0 };
        }
        catStats[catId]!.itemsSold += item.quantity;
        catStats[catId]!.revenue += item.lineTotal;
      }
    }

    return Object.values(catStats).sort((a, b) => b.revenue - a.revenue);
  },
});

// ============================================================
// 5. getChannelReport
// ============================================================
export const getChannelReport = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const eligible = revenueOrders(
      await fetchOrdersInRange(ctx, args.tenantId, args.startDate, args.endDate)
    );

    const channels: Record<string, { source: string; count: number; revenue: number }> = {};
    for (const o of eligible) {
      if (!channels[o.source]) {
        channels[o.source] = { source: o.source, count: 0, revenue: 0 };
      }
      channels[o.source]!.count += 1;
      channels[o.source]!.revenue += o.total;
    }

    return Object.values(channels).map((c) => ({
      ...c,
      avgOrderValue: c.count > 0 ? Math.round(c.revenue / c.count) : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  },
});

// ============================================================
// 6. getPaymentMethodReport
// ============================================================
export const getPaymentMethodReport = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const eligible = revenueOrders(
      await fetchOrdersInRange(ctx, args.tenantId, args.startDate, args.endDate)
    );

    // Only consider paid orders for payment method breakdown
    const paidOrders = eligible.filter((o) => o.paymentStatus === "paid");

    const methods: Record<string, { method: string; count: number; total: number }> = {};
    for (const o of paidOrders) {
      const method = o.paymentMethod ?? "unknown";
      if (!methods[method]) {
        methods[method] = { method, count: 0, total: 0 };
      }
      methods[method]!.count += 1;
      methods[method]!.total += o.total;
    }

    const grandTotal = paidOrders.reduce((sum, o) => sum + o.total, 0);

    return Object.values(methods).map((m) => ({
      ...m,
      percentage: grandTotal > 0 ? Math.round((m.total / grandTotal) * 10000) / 100 : 0,
    })).sort((a, b) => b.total - a.total);
  },
});

// ============================================================
// 7. getDiscountReport
// ============================================================
export const getDiscountReport = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const allOrders = await fetchOrdersInRange(ctx, args.tenantId, args.startDate, args.endDate);

    let totalDiscounts = 0;
    let totalComps = 0;
    let totalVoidedItems = 0;
    const discountsByType: Record<string, { count: number; total: number }> = {};

    // Track discount names (from discountId lookups)
    const discountIdCounts: Record<string, { name: string; count: number; total: number }> = {};

    for (const o of allOrders) {
      // Voids
      for (const item of o.items) {
        if (item.isVoided) {
          totalVoidedItems += item.quantity;
        }
      }

      // Comps
      if (o.isComped && o.discountAmount) {
        totalComps += o.discountAmount;
        continue; // comps are separate from discounts
      }

      // Discounts
      if (o.discountType && o.discountAmount && o.discountAmount > 0) {
        totalDiscounts += o.discountAmount;
        const dtype = o.discountType;
        if (!discountsByType[dtype]) {
          discountsByType[dtype] = { count: 0, total: 0 };
        }
        discountsByType[dtype]!.count += 1;
        discountsByType[dtype]!.total += o.discountAmount;

        // Track by discountId for "top used"
        if (o.discountId) {
          const did = o.discountId as string;
          if (!discountIdCounts[did]) {
            discountIdCounts[did] = { name: "", count: 0, total: 0 };
          }
          discountIdCounts[did]!.count += 1;
          discountIdCounts[did]!.total += o.discountAmount;
        }
      }
    }

    // Resolve discount names
    for (const did of Object.keys(discountIdCounts)) {
      const discount = await ctx.db.get(did as Id<"discounts">);
      if (discount) {
        discountIdCounts[did]!.name = discount.name;
      }
    }

    const topDiscounts = Object.values(discountIdCounts)
      .filter((d) => d.name)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalDiscounts,
      totalComps,
      totalVoidedItems,
      discountsByType,
      topDiscounts,
    };
  },
});

// ============================================================
// 8. getTaxReport
// ============================================================
export const getTaxReport = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const eligible = revenueOrders(
      await fetchOrdersInRange(ctx, args.tenantId, args.startDate, args.endDate)
    );

    let totalTax = 0;
    let totalSubtotal = 0;
    const taxByDate: Record<string, { date: string; tax: number; subtotal: number }> = {};

    for (const o of eligible) {
      totalTax += o.tax;
      totalSubtotal += o.subtotal;

      const dateKey = new Date(o.createdAt).toISOString().split("T")[0]!;
      if (!taxByDate[dateKey]) {
        taxByDate[dateKey] = { date: dateKey, tax: 0, subtotal: 0 };
      }
      taxByDate[dateKey]!.tax += o.tax;
      taxByDate[dateKey]!.subtotal += o.subtotal;
    }

    const effectiveTaxRate = totalSubtotal > 0
      ? Math.round((totalTax / totalSubtotal) * 10000) / 100
      : 0;

    return {
      totalTax,
      effectiveTaxRate,
      taxByDate: Object.values(taxByDate).sort((a, b) => a.date.localeCompare(b.date)),
    };
  },
});

// ============================================================
// 9. getTopItems
// ============================================================
export const getTopItems = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const eligible = revenueOrders(
      await fetchOrdersInRange(ctx, args.tenantId, args.startDate, args.endDate)
    );

    const itemStats: Record<
      string,
      { name: string; quantitySold: number; revenue: number }
    > = {};

    for (const o of eligible) {
      for (const item of o.items) {
        if (item.isVoided) continue;
        const key = item.menuItemId as string;
        if (!itemStats[key]) {
          itemStats[key] = { name: item.name, quantitySold: 0, revenue: 0 };
        }
        itemStats[key]!.quantitySold += item.quantity;
        itemStats[key]!.revenue += item.lineTotal;
      }
    }

    const items = Object.values(itemStats).map((s) => ({
      ...s,
      avgPrice: s.quantitySold > 0 ? Math.round(s.revenue / s.quantitySold) : 0,
    }));

    // Return top 20 by quantity and top 20 by revenue
    const byQuantity = [...items].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 20);
    const byRevenue = [...items].sort((a, b) => b.revenue - a.revenue).slice(0, 20);

    return { byQuantity, byRevenue };
  },
});

// ============================================================
// 10. getComparisonReport
// ============================================================
export const getComparisonReport = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const periodLength = args.endDate - args.startDate;
    const prevStart = args.startDate - periodLength;
    const prevEnd = args.startDate;

    const currentOrders = revenueOrders(
      await fetchOrdersInRange(ctx, args.tenantId, args.startDate, args.endDate)
    );
    const prevOrders = revenueOrders(
      await fetchOrdersInRange(ctx, args.tenantId, prevStart, prevEnd)
    );

    const currentRevenue = currentOrders.reduce((s, o) => s + o.total, 0);
    const prevRevenue = prevOrders.reduce((s, o) => s + o.total, 0);

    const currentCount = currentOrders.length;
    const prevCount = prevOrders.length;

    const currentAvg = currentCount > 0 ? Math.round(currentRevenue / currentCount) : 0;
    const prevAvg = prevCount > 0 ? Math.round(prevRevenue / prevCount) : 0;

    function pctChange(current: number, previous: number): number {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 10000) / 100;
    }

    return {
      current: {
        revenue: currentRevenue,
        orderCount: currentCount,
        avgOrderValue: currentAvg,
      },
      previous: {
        revenue: prevRevenue,
        orderCount: prevCount,
        avgOrderValue: prevAvg,
      },
      changes: {
        revenueChangePct: pctChange(currentRevenue, prevRevenue),
        orderCountChangePct: pctChange(currentCount, prevCount),
        avgOrderValueChangePct: pctChange(currentAvg, prevAvg),
      },
    };
  },
});

// ============================================================
// 11. exportReportData
// ============================================================
export const exportReportData = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const orders = await fetchOrdersInRange(ctx, args.tenantId, args.startDate, args.endDate);

    return orders.map((o) => ({
      orderId: o._id,
      orderNumber: o.orderNumber,
      source: o.source,
      status: o.status,
      tableName: o.tableName ?? null,
      customerName: o.customerName ?? null,
      customerPhone: o.customerPhone ?? null,
      customerEmail: o.customerEmail ?? null,
      items: o.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        isVoided: item.isVoided ?? false,
      })),
      subtotal: o.subtotal,
      tax: o.tax,
      total: o.total,
      tipAmount: o.tipAmount ?? o.tip ?? 0,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod ?? null,
      discountType: o.discountType ?? null,
      discountAmount: o.discountAmount ?? 0,
      isComped: o.isComped ?? false,
      serverId: o.serverId ?? null,
      serverName: o.serverName ?? null,
      createdAt: o.createdAt,
      completedAt: o.completedAt ?? null,
    }));
  },
});

// ============================================================
// Legacy: getDailySales (kept for backward compatibility)
// ============================================================
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
        .withIndex("by_tenantId_createdAt", (q: any) =>
          q
            .eq("tenantId", args.tenantId)
            .gte("createdAt", dayStart.getTime())
        )
        .collect();

      // Filter to this day and completed/paid orders
      const dayOrders = orders.filter(
        (o: Doc<"orders">) =>
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
        totalRevenue: dayOrders.reduce((sum: number, o: Doc<"orders">) => sum + o.total, 0),
        orderCount: dayOrders.length,
        bySource,
      });
    }

    return dailyData;
  },
});

// ============================================================
// Legacy: getTipReport (kept for backward compatibility)
// ============================================================
export const getTipReport = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
    serverId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden");
    }

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_tenantId_createdAt", (q: any) =>
        q
          .eq("tenantId", args.tenantId)
          .gte("createdAt", args.startDate)
      )
      .collect();

    const filtered = orders.filter(
      (o: Doc<"orders">) =>
        o.createdAt <= args.endDate &&
        (o.paymentStatus === "paid" || o.status === "completed")
    );

    const tippedOrders = args.serverId
      ? filtered.filter((o: Doc<"orders">) => o.serverId === args.serverId)
      : filtered;

    let totalTips = 0;
    let cashTips = 0;
    let cardTips = 0;
    let subtotalSum = 0;

    const serverMap: Record<
      string,
      { serverId: string; serverName: string; totalTips: number; orderCount: number }
    > = {};

    const dayMap: Record<string, number> = {};

    for (const order of tippedOrders) {
      const tipValue = order.tipAmount ?? order.tip ?? 0;
      if (tipValue === 0) continue;

      totalTips += tipValue;
      subtotalSum += order.subtotal;

      const method = order.tipMethod ?? order.paymentMethod;
      if (method === "cash") {
        cashTips += tipValue;
      } else {
        cardTips += tipValue;
      }

      const sid = order.serverId;
      if (sid) {
        const sidStr = sid as string;
        if (!serverMap[sidStr]) {
          serverMap[sidStr] = {
            serverId: sidStr,
            serverName: order.serverName ?? "Unknown",
            totalTips: 0,
            orderCount: 0,
          };
        }
        serverMap[sidStr]!.totalTips += tipValue;
        serverMap[sidStr]!.orderCount += 1;
      }

      const dateKey = new Date(order.createdAt).toISOString().split("T")[0]!;
      dayMap[dateKey] = (dayMap[dateKey] ?? 0) + tipValue;
    }

    const averageTipPercent =
      subtotalSum > 0 ? Math.round((totalTips / subtotalSum) * 10000) / 100 : 0;

    const tipsByDay = Object.entries(dayMap)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const tipsByServer = Object.values(serverMap).sort(
      (a, b) => b.totalTips - a.totalTips
    );

    return {
      totalTips,
      tipsByMethod: { cash: cashTips, card: cardTips },
      tipsByServer,
      averageTipPercent,
      tipsByDay,
    };
  },
});
