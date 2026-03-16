import { query } from "../_generated/server";
import { v } from "convex/values";

export const getRecentLogs = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webhookLogs")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(50);
  },
});

export const getFailedLogs = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webhookLogs")
      .withIndex("by_tenantId_status", (q) =>
        q.eq("tenantId", args.tenantId).eq("status", "failed")
      )
      .order("desc")
      .take(20);
  },
});
