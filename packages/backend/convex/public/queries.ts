import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Public queries for the online ordering page.
 * No auth required — these are customer-facing.
 */

export const getTenantBySubdomain = query({
  args: { subdomain: v.string() },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", args.subdomain))
      .first();

    if (!tenant || tenant.status !== "active") return null;

    // Return only public-safe fields
    return {
      _id: tenant._id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      primaryColor: tenant.primaryColor,
      accentColor: tenant.accentColor,
      phone: tenant.phone,
      email: tenant.email,
      address: tenant.address,
      timezone: tenant.timezone,
    };
  },
});

export const getMenu = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("menuCategories")
      .withIndex("by_tenantId_sortOrder", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const activeCategories = categories.filter((c) => c.isActive !== false);

    const items = await ctx.db
      .query("menuItems")
      .withIndex("by_tenantId_available", (q) =>
        q.eq("tenantId", args.tenantId).eq("isAvailable", true)
      )
      .collect();

    // Group items by category
    const menu = activeCategories.map((cat) => ({
      ...cat,
      items: items.filter((i) => i.categoryId === cat._id && !i.is86d),
    }));

    return menu;
  },
});

export const getModifiersForItem = query({
  args: { tenantId: v.id("tenants"), menuItemId: v.id("menuItems") },
  handler: async (ctx, args) => {
    const groups = await ctx.db
      .query("modifierGroups")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter groups that apply to this item
    const applicable = groups.filter((g) =>
      g.menuItemIds.includes(args.menuItemId)
    );

    // Get options for each group
    const result = await Promise.all(
      applicable.map(async (group) => {
        const options = await ctx.db
          .query("modifierOptions")
          .withIndex("by_groupId", (q) => q.eq("groupId", group._id))
          .collect();

        return {
          ...group,
          options: options.filter((o) => o.isAvailable !== false),
        };
      })
    );

    return result;
  },
});
