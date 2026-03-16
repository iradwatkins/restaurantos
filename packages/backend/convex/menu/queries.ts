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

export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getModifierGroupsForItem = query({
  args: { tenantId: v.id("tenants"), menuItemId: v.id("menuItems") },
  handler: async (ctx, args) => {
    const groups = await ctx.db
      .query("modifierGroups")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const applicable = groups.filter((g) =>
      g.menuItemIds.includes(args.menuItemId)
    );

    const result = await Promise.all(
      applicable.map(async (group) => {
        const options = await ctx.db
          .query("modifierOptions")
          .withIndex("by_groupId", (q) => q.eq("groupId", group._id))
          .collect();

        return {
          ...group,
          options: options.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
        };
      })
    );

    return result;
  },
});
