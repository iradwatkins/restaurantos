import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess, assertTenantOwnership } from "../lib/tenant_auth";

export const createDiscount = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    type: v.union(v.literal("percentage"), v.literal("fixed")),
    value: v.number(),
    requiresApproval: v.boolean(),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot create discounts for another tenant");
    }

    if (args.type === "percentage" && (args.value < 0 || args.value > 100)) {
      throw new Error("Percentage discount value must be between 0 and 100");
    }
    if (args.type === "fixed" && args.value < 0) {
      throw new Error("Fixed discount value must be non-negative");
    }

    return await ctx.db.insert("discounts", {
      tenantId: args.tenantId,
      name: args.name,
      type: args.type,
      value: args.value,
      isActive: true,
      requiresApproval: args.requiresApproval,
      createdAt: Date.now(),
    });
  },
});

export const updateDiscount = mutation({
  args: {
    id: v.id("discounts"),
    name: v.optional(v.string()),
    type: v.optional(v.union(v.literal("percentage"), v.literal("fixed"))),
    value: v.optional(v.number()),
    requiresApproval: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const discount = await ctx.db.get(args.id);
    assertTenantOwnership(discount, currentUser.tenantId);

    const effectiveType = args.type ?? discount.type;
    const effectiveValue = args.value ?? discount.value;

    if (effectiveType === "percentage" && (effectiveValue < 0 || effectiveValue > 100)) {
      throw new Error("Percentage discount value must be between 0 and 100");
    }
    if (effectiveType === "fixed" && effectiveValue < 0) {
      throw new Error("Fixed discount value must be non-negative");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deleteDiscount = mutation({
  args: {
    id: v.id("discounts"),
    hard: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const discount = await ctx.db.get(args.id);
    assertTenantOwnership(discount, currentUser.tenantId);

    if (args.hard) {
      await ctx.db.delete(args.id);
    } else {
      await ctx.db.patch(args.id, { isActive: false });
    }
  },
});

export const toggleDiscount = mutation({
  args: {
    id: v.id("discounts"),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const discount = await ctx.db.get(args.id);
    assertTenantOwnership(discount, currentUser.tenantId);

    const newState = !discount.isActive;
    await ctx.db.patch(args.id, { isActive: newState });

    return { isActive: newState, name: discount.name };
  },
});
