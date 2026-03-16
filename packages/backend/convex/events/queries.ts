import { query } from "../_generated/server";
import { v } from "convex/values";

export const getEvents = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return events.filter((e) => e.isActive).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },
});

export const getEventWithPricing = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    const tiers = await ctx.db
      .query("eventPricingTiers")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .collect();

    return {
      ...event,
      pricingTiers: tiers.sort((a, b) => a.sortOrder - b.sortOrder),
    };
  },
});

export const getEventsWithPricing = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const activeEvents = events.filter((e) => e.isActive);

    const result = await Promise.all(
      activeEvents.map(async (event) => {
        const tiers = await ctx.db
          .query("eventPricingTiers")
          .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
          .collect();

        return {
          ...event,
          pricingTiers: tiers.sort((a, b) => a.sortOrder - b.sortOrder),
        };
      })
    );

    return result.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },
});
