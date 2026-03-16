import { query } from "../_generated/server";
import { v } from "convex/values";

export const getActiveTickets = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const tickets = await ctx.db
      .query("kdsTickets")
      .withIndex("by_tenantId_status", (q) =>
        q.eq("tenantId", args.tenantId).eq("status", "new")
      )
      .collect();

    const inProgress = await ctx.db
      .query("kdsTickets")
      .withIndex("by_tenantId_status", (q) =>
        q.eq("tenantId", args.tenantId).eq("status", "in_progress")
      )
      .collect();

    return [...tickets, ...inProgress].sort(
      (a, b) => a.receivedAt - b.receivedAt
    );
  },
});

export const getRecallQueue = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    // Last 20 bumped tickets from the past 30 minutes
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;

    const bumped = await ctx.db
      .query("kdsBumpHistory")
      .withIndex("by_tenantId_bumpedAt", (q) =>
        q.eq("tenantId", args.tenantId).gte("bumpedAt", thirtyMinAgo)
      )
      .order("desc")
      .take(20);

    return bumped;
  },
});

export const getTicketByOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("kdsTickets")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .first();
  },
});
