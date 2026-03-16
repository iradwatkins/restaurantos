import { query } from "../_generated/server";
import { v } from "convex/values";

export const getCategories = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menuCategories")
      .withIndex("by_tenantId_sortOrder", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const getItems = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menuItems")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const getItemsByCategory = query({
  args: { categoryId: v.id("menuCategories") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menuItems")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.categoryId))
      .collect();
  },
});

export const getModifierGroups = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("modifierGroups")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const getModifierOptions = query({
  args: { groupId: v.id("modifierGroups") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("modifierOptions")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();
  },
});

export const getAvailableItems = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menuItems")
      .withIndex("by_tenantId_available", (q) =>
        q.eq("tenantId", args.tenantId).eq("isAvailable", true)
      )
      .collect();
  },
});
