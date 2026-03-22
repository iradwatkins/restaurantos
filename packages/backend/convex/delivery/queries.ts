import { query } from "../_generated/server";
import { v } from "convex/values";

export const getDeliveryStatus = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deliveries")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .first();
  },
});

export const getActiveDeliveries = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const activeStatuses = ["pending", "assigned", "picked_up"] as const;

    const statusQueries = activeStatuses.map((status) =>
      ctx.db
        .query("deliveries")
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

export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deliveries")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});

/**
 * Get delivery history (delivered or cancelled) for a tenant.
 * Returns the most recent 100 entries sorted by creation time descending.
 */
export const getDeliveryHistory = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const deliveredQuery = ctx.db
      .query("deliveries")
      .withIndex("by_tenantId_status", (q) =>
        q.eq("tenantId", args.tenantId).eq("status", "delivered")
      )
      .collect();

    const cancelledQuery = ctx.db
      .query("deliveries")
      .withIndex("by_tenantId_status", (q) =>
        q.eq("tenantId", args.tenantId).eq("status", "cancelled")
      )
      .collect();

    const [delivered, cancelled] = await Promise.all([deliveredQuery, cancelledQuery]);
    const merged = [...delivered, ...cancelled];

    // Sort by creation time descending and limit
    return merged.sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
  },
});

/**
 * Get the delivery record for a specific order.
 */
export const getByOrderId = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deliveries")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .first();
  },
});
