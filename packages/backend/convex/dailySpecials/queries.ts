import { query } from "../_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dailySpecials")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const getToday = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const today = new Date().getDay(); // 0=Sunday
    const specials = await ctx.db
      .query("dailySpecials")
      .withIndex("by_tenantId_dayOfWeek", (q) =>
        q.eq("tenantId", args.tenantId).eq("dayOfWeek", today)
      )
      .collect();

    return specials.filter((s) => s.isActive)[0] ?? null;
  },
});

export const getByDay = query({
  args: { tenantId: v.id("tenants"), dayOfWeek: v.number() },
  handler: async (ctx, args) => {
    const specials = await ctx.db
      .query("dailySpecials")
      .withIndex("by_tenantId_dayOfWeek", (q) =>
        q.eq("tenantId", args.tenantId).eq("dayOfWeek", args.dayOfWeek)
      )
      .collect();

    return specials.filter((s) => s.isActive)[0] ?? null;
  },
});
