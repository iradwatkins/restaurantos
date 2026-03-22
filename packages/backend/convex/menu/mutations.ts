import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess, assertTenantOwnership } from "../lib/tenant_auth";

// ==================== Categories ====================

export const createCategory = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    menuType: v.optional(
      v.union(v.literal("all"), v.literal("lunch"), v.literal("dinner"))
    ),
    visibleFrom: v.optional(v.string()),
    visibleTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot manage menu for another tenant");
    }

    // Auto-calculate sort order if not provided
    let sortOrder = args.sortOrder ?? 0;
    if (!args.sortOrder) {
      const existing = await ctx.db
        .query("menuCategories")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
        .collect();
      sortOrder = existing.length;
    }

    return await ctx.db.insert("menuCategories", {
      tenantId: args.tenantId,
      name: args.name,
      description: args.description,
      sortOrder,
      isActive: true,
      menuType: args.menuType ?? "all",
      visibleFrom: args.visibleFrom,
      visibleTo: args.visibleTo,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateCategory = mutation({
  args: {
    id: v.id("menuCategories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    menuType: v.optional(
      v.union(v.literal("all"), v.literal("lunch"), v.literal("dinner"))
    ),
    visibleFrom: v.optional(v.string()),
    visibleTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const deleteCategory = mutation({
  args: { id: v.id("menuCategories") },
  handler: async (ctx, args) => {
    // Check for items in this category
    const items = await ctx.db
      .query("menuItems")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.id))
      .collect();

    if (items.length > 0) {
      throw new Error("Cannot delete category with existing menu items. Move or delete items first.");
    }

    await ctx.db.delete(args.id);
  },
});

// ==================== Menu Items ====================

export const createItem = mutation({
  args: {
    tenantId: v.id("tenants"),
    categoryId: v.id("menuCategories"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    dietaryTags: v.optional(v.array(v.string())),
    prepTimeMinutes: v.optional(v.number()),
    type: v.optional(
      v.union(
        v.literal("food"),
        v.literal("beer"),
        v.literal("wine"),
        v.literal("spirits"),
        v.literal("non_alcoholic_beverage")
      )
    ),
    isSpecial: v.optional(v.boolean()),
    availableFrom: v.optional(v.number()),
    availableTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot manage menu for another tenant");
    }

    // Get sort order
    const existing = await ctx.db
      .query("menuItems")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    return await ctx.db.insert("menuItems", {
      tenantId: args.tenantId,
      categoryId: args.categoryId,
      name: args.name,
      description: args.description,
      price: args.price,
      imageUrl: args.imageUrl,
      imageStorageId: args.imageStorageId,
      dietaryTags: args.dietaryTags,
      isAvailable: true,
      is86d: false,
      sortOrder: existing.length,
      prepTimeMinutes: args.prepTimeMinutes,
      type: args.type ?? "food",
      isSpecial: args.isSpecial ?? false,
      availableFrom: args.availableFrom,
      availableTo: args.availableTo,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateItem = mutation({
  args: {
    id: v.id("menuItems"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    dietaryTags: v.optional(v.array(v.string())),
    isAvailable: v.optional(v.boolean()),
    prepTimeMinutes: v.optional(v.number()),
    categoryId: v.optional(v.id("menuCategories")),
    type: v.optional(
      v.union(
        v.literal("food"),
        v.literal("beer"),
        v.literal("wine"),
        v.literal("spirits"),
        v.literal("non_alcoholic_beverage")
      )
    ),
    isSpecial: v.optional(v.boolean()),
    availableFrom: v.optional(v.number()),
    availableTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const deleteItem = mutation({
  args: { id: v.id("menuItems") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const toggle86 = mutation({
  args: { id: v.id("menuItems") },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");
    assertTenantOwnership(item, currentUser.tenantId);

    const newState = !item.is86d;
    await ctx.db.patch(args.id, {
      is86d: newState,
      isAvailable: !newState,
      updatedAt: Date.now(),
    });

    return { is86d: newState, itemName: item.name };
  },
});

// ==================== Modifier Groups ====================

export const createModifierGroup = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    minSelections: v.number(),
    maxSelections: v.number(),
    menuItemIds: v.array(v.id("menuItems")),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot manage menu for another tenant");
    }

    return await ctx.db.insert("modifierGroups", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const createModifierOption = mutation({
  args: {
    tenantId: v.id("tenants"),
    groupId: v.id("modifierGroups"),
    name: v.string(),
    priceAdjustment: v.number(),
    isDefault: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot manage menu for another tenant");
    }

    return await ctx.db.insert("modifierOptions", {
      tenantId: args.tenantId,
      groupId: args.groupId,
      name: args.name,
      priceAdjustment: args.priceAdjustment,
      isDefault: args.isDefault ?? false,
      isAvailable: true,
      sortOrder: args.sortOrder ?? 0,
    });
  },
});

export const updateModifierGroup = mutation({
  args: {
    id: v.id("modifierGroups"),
    name: v.optional(v.string()),
    minSelections: v.optional(v.number()),
    maxSelections: v.optional(v.number()),
    menuItemIds: v.optional(v.array(v.id("menuItems"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const deleteModifierGroup = mutation({
  args: { id: v.id("modifierGroups") },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const group = await ctx.db.get(args.id);
    assertTenantOwnership(group, currentUser.tenantId);

    // Delete all options in this group first
    const options = await ctx.db
      .query("modifierOptions")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.id))
      .collect();

    for (const option of options) {
      await ctx.db.delete(option._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const updateModifierOption = mutation({
  args: {
    id: v.id("modifierOptions"),
    name: v.optional(v.string()),
    priceAdjustment: v.optional(v.number()),
    isDefault: v.optional(v.boolean()),
    isAvailable: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deleteModifierOption = mutation({
  args: { id: v.id("modifierOptions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ==================== File Storage ====================

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
