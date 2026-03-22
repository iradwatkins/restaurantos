import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";

/**
 * Returns the full menu data optimized for offline caching.
 * Includes categories, items, modifier groups, modifier options, and image URLs.
 */
export const getMenuForOffline = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    // Fetch all menu data in parallel
    const [categories, items, modifierGroups, modifierOptions] = await Promise.all([
      ctx.db
        .query("menuCategories")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      ctx.db
        .query("menuItems")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      ctx.db
        .query("modifierGroups")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
      ctx.db
        .query("modifierOptions")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
        .collect(),
    ]);

    // Resolve image URLs for items that have storage IDs
    const itemsWithImages = await Promise.all(
      items.map(async (item) => {
        let resolvedImageUrl = item.imageUrl;
        if (item.imageStorageId) {
          const url = await ctx.storage.getUrl(item.imageStorageId);
          if (url) {
            resolvedImageUrl = url;
          }
        }
        return {
          _id: item._id,
          categoryId: item.categoryId,
          name: item.name,
          description: item.description,
          price: item.price,
          imageUrl: resolvedImageUrl,
          dietaryTags: item.dietaryTags,
          isAvailable: item.isAvailable,
          is86d: item.is86d,
          sortOrder: item.sortOrder,
          prepTimeMinutes: item.prepTimeMinutes,
          type: item.type,
          isSpecial: item.isSpecial,
          availableFrom: item.availableFrom,
          availableTo: item.availableTo,
        };
      })
    );

    // Group modifier options by group
    const optionsByGroup: Record<string, typeof modifierOptions> = {};
    for (const option of modifierOptions) {
      const groupId = option.groupId;
      if (!optionsByGroup[groupId]) {
        optionsByGroup[groupId] = [];
      }
      optionsByGroup[groupId].push(option);
    }

    const groupsWithOptions = modifierGroups.map((group) => ({
      _id: group._id,
      name: group.name,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      menuItemIds: group.menuItemIds,
      options: (optionsByGroup[group._id] ?? [])
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((o) => ({
          _id: o._id,
          name: o.name,
          priceAdjustment: o.priceAdjustment,
          isDefault: o.isDefault,
          isAvailable: o.isAvailable,
          sortOrder: o.sortOrder,
        })),
    }));

    return {
      categories: categories.map((c) => ({
        _id: c._id,
        name: c.name,
        description: c.description,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        menuType: c.menuType,
        visibleFrom: c.visibleFrom,
        visibleTo: c.visibleTo,
      })),
      items: itemsWithImages,
      modifierGroups: groupsWithOptions,
      syncedAt: Date.now(),
    };
  },
});

/**
 * Returns the last sync timestamp for a tenant.
 * Used by the client to determine if a re-sync is needed.
 */
export const getSyncStatus = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    // Get the most recent order to determine last activity
    const latestOrder = await ctx.db
      .query("orders")
      .withIndex("by_tenantId_createdAt", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .first();

    // Get the most recently updated menu item for menu change detection
    const allItems = await ctx.db
      .query("menuItems")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    let latestMenuUpdate = 0;
    for (const item of allItems) {
      const itemTime = item.updatedAt ?? item.createdAt ?? 0;
      if (itemTime > latestMenuUpdate) {
        latestMenuUpdate = itemTime;
      }
    }

    return {
      tenantId: args.tenantId,
      lastOrderAt: latestOrder?.createdAt ?? null,
      lastMenuUpdateAt: latestMenuUpdate > 0 ? latestMenuUpdate : null,
      serverTime: Date.now(),
    };
  },
});
