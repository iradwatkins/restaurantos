import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";

export const getByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(100);
  },
});

export const getActiveOrders = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    // Query each active status via the compound index instead of scanning all orders
    const activeStatuses = ["open", "sent_to_kitchen", "preparing", "ready"] as const;

    const statusQueries = activeStatuses.map((status) =>
      ctx.db
        .query("orders")
        .withIndex("by_tenantId_status", (q) =>
          q.eq("tenantId", args.tenantId).eq("status", status)
        )
        .collect()
    );

    const results = await Promise.all(statusQueries);
    const merged = results.flat();

    // Sort by creation time descending (newest first)
    return merged.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getById = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByTable = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_tableId", (q) => q.eq("tableId", args.tableId))
      .order("desc")
      .take(10);
  },
});

export const getTables = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tables")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const getPayments = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();
  },
});

/**
 * List orders within a date range for a tenant.
 * Used for accounting sync (daily journal entries).
 */
export const listByDateRange = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_tenantId_createdAt", (q) =>
        q
          .eq("tenantId", args.tenantId)
          .gte("createdAt", args.startDate)
          .lte("createdAt", args.endDate)
      )
      .collect();
  },
});

export const getOpenTabs = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx);

    const tabs = await ctx.db
      .query("orders")
      .withIndex("by_tenantId_isTab_tabStatus", (q) =>
        q
          .eq("tenantId", args.tenantId)
          .eq("isTab", true)
          .eq("tabStatus", "open")
      )
      .collect();

    // Sort by tabOpenedAt ascending (oldest first)
    return tabs.sort((a, b) => (a.tabOpenedAt ?? 0) - (b.tabOpenedAt ?? 0));
  },
});
