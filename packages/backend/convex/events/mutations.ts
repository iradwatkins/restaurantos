import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess, assertTenantOwnership } from "../lib/tenant_auth";

export const createEvent = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("buffet"), v.literal("special"), v.literal("prix_fixe"),
      v.literal("holiday"), v.literal("other")
    ),
    recurrence: v.union(v.literal("once"), v.literal("weekly"), v.literal("monthly")),
    dayOfWeek: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    startTime: v.string(),
    endTime: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden");
    }

    return await ctx.db.insert("events", {
      ...args,
      isActive: true,
      sortOrder: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateEvent = mutation({
  args: {
    id: v.id("events"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.union(
      v.literal("buffet"), v.literal("special"), v.literal("prix_fixe"),
      v.literal("holiday"), v.literal("other")
    )),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const event = await ctx.db.get(args.id);
    assertTenantOwnership(event, user.tenantId);

    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const deleteEvent = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const event = await ctx.db.get(args.id);
    assertTenantOwnership(event, user.tenantId);

    // Delete pricing tiers first
    const tiers = await ctx.db
      .query("eventPricingTiers")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.id))
      .collect();
    for (const tier of tiers) {
      await ctx.db.delete(tier._id);
    }
    await ctx.db.delete(args.id);
  },
});

export const createPricingTier = mutation({
  args: {
    tenantId: v.id("tenants"),
    eventId: v.id("events"),
    tierName: v.string(),
    price: v.number(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden");
    }
    // Also verify the event belongs to this tenant
    const event = await ctx.db.get(args.eventId);
    assertTenantOwnership(event, user.tenantId);

    return await ctx.db.insert("eventPricingTiers", args);
  },
});

export const updatePricingTier = mutation({
  args: {
    id: v.id("eventPricingTiers"),
    tierName: v.optional(v.string()),
    price: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const tier = await ctx.db.get(args.id);
    assertTenantOwnership(tier, user.tenantId);

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deletePricingTier = mutation({
  args: { id: v.id("eventPricingTiers") },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const tier = await ctx.db.get(args.id);
    assertTenantOwnership(tier, user.tenantId);

    await ctx.db.delete(args.id);
  },
});
