import { query } from "../_generated/server";
import { v } from "convex/values";

export const getCategories = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cateringCategories")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const getItems = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cateringMenuItems")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const getOrders = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cateringOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const getOrderById = query({
  args: { id: v.id("cateringOrders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getUpcomingEvents = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const orders = await ctx.db
      .query("cateringOrders")
      .withIndex("by_tenantId_eventDate", (q) =>
        q.eq("tenantId", args.tenantId).gte("eventDate", now)
      )
      .collect();

    return orders
      .filter((o) => o.status !== "cancelled" && o.status !== "completed")
      .sort((a, b) => a.eventDate - b.eventDate);
  },
});
