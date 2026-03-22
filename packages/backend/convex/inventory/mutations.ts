import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess, assertTenantOwnership } from "../lib/tenant_auth";

// ==================== Ingredient CRUD ====================

export const createIngredient = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    unit: v.string(),
    currentStock: v.number(),
    lowStockThreshold: v.number(),
    costPerUnit: v.number(),
    par: v.optional(v.number()),
    category: v.optional(v.string()),
    supplier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot manage inventory for another tenant");
    }

    if (args.currentStock < 0) {
      throw new Error("Current stock cannot be negative");
    }
    if (args.lowStockThreshold < 0) {
      throw new Error("Low stock threshold cannot be negative");
    }
    if (args.costPerUnit < 0) {
      throw new Error("Cost per unit cannot be negative");
    }
    if (args.par !== undefined && args.par < 0) {
      throw new Error("Par level cannot be negative");
    }

    return await ctx.db.insert("ingredients", {
      tenantId: args.tenantId,
      name: args.name,
      unit: args.unit,
      currentStock: args.currentStock,
      lowStockThreshold: args.lowStockThreshold,
      costPerUnit: args.costPerUnit,
      par: args.par,
      category: args.category,
      supplier: args.supplier,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updateIngredient = mutation({
  args: {
    id: v.id("ingredients"),
    name: v.optional(v.string()),
    unit: v.optional(v.string()),
    lowStockThreshold: v.optional(v.number()),
    costPerUnit: v.optional(v.number()),
    par: v.optional(v.number()),
    category: v.optional(v.string()),
    supplier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const ingredient = await ctx.db.get(args.id);
    assertTenantOwnership(ingredient, user.tenantId);

    if (args.lowStockThreshold !== undefined && args.lowStockThreshold < 0) {
      throw new Error("Low stock threshold cannot be negative");
    }
    if (args.costPerUnit !== undefined && args.costPerUnit < 0) {
      throw new Error("Cost per unit cannot be negative");
    }
    if (args.par !== undefined && args.par < 0) {
      throw new Error("Par level cannot be negative");
    }

    const { id, ...updates } = args;
    // Filter out undefined values to avoid overwriting with undefined
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    await ctx.db.patch(id, patch);
  },
});

export const deleteIngredient = mutation({
  args: {
    id: v.id("ingredients"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const ingredient = await ctx.db.get(args.id);
    assertTenantOwnership(ingredient, user.tenantId);

    // Soft-delete: deactivate instead of removing
    await ctx.db.patch(args.id, { isActive: false });
  },
});

// ==================== Menu Item ↔ Ingredient Linking ====================

export const linkIngredient = mutation({
  args: {
    tenantId: v.id("tenants"),
    menuItemId: v.id("menuItems"),
    ingredientId: v.id("ingredients"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot manage inventory for another tenant");
    }

    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than zero");
    }

    // Verify menu item belongs to tenant
    const menuItem = await ctx.db.get(args.menuItemId);
    assertTenantOwnership(menuItem, user.tenantId);

    // Verify ingredient belongs to tenant
    const ingredient = await ctx.db.get(args.ingredientId);
    assertTenantOwnership(ingredient, user.tenantId);

    // Check for existing link
    const existingLinks = await ctx.db
      .query("menuItemIngredients")
      .withIndex("by_menuItemId", (q) => q.eq("menuItemId", args.menuItemId))
      .collect();

    const duplicate = existingLinks.find(
      (link) => link.ingredientId === args.ingredientId
    );
    if (duplicate) {
      throw new Error(
        "This ingredient is already linked to this menu item. Use updateIngredientQuantity to change the amount."
      );
    }

    return await ctx.db.insert("menuItemIngredients", {
      tenantId: args.tenantId,
      menuItemId: args.menuItemId,
      ingredientId: args.ingredientId,
      quantity: args.quantity,
    });
  },
});

export const unlinkIngredient = mutation({
  args: {
    id: v.id("menuItemIngredients"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const link = await ctx.db.get(args.id);
    assertTenantOwnership(link, user.tenantId);

    await ctx.db.delete(args.id);
  },
});

export const updateIngredientQuantity = mutation({
  args: {
    id: v.id("menuItemIngredients"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const link = await ctx.db.get(args.id);
    assertTenantOwnership(link, user.tenantId);

    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than zero");
    }

    await ctx.db.patch(args.id, { quantity: args.quantity });
  },
});

// ==================== Stock Operations ====================

export const receiveStock = mutation({
  args: {
    ingredientId: v.id("ingredients"),
    quantity: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const ingredient = await ctx.db.get(args.ingredientId);
    assertTenantOwnership(ingredient, user.tenantId);

    if (args.quantity <= 0) {
      throw new Error("Receive quantity must be greater than zero");
    }

    const previousStock = ingredient.currentStock;
    const newStock = previousStock + args.quantity;

    await ctx.db.patch(args.ingredientId, { currentStock: newStock });

    await ctx.db.insert("inventoryLogs", {
      tenantId: user.tenantId,
      ingredientId: args.ingredientId,
      type: "receive",
      quantityChange: args.quantity,
      previousStock,
      newStock,
      reason: args.reason ?? "Stock received",
      performedBy: user.name ?? user.email,
      createdAt: Date.now(),
    });

    return { previousStock, newStock };
  },
});

export const recordWaste = mutation({
  args: {
    ingredientId: v.id("ingredients"),
    quantity: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const ingredient = await ctx.db.get(args.ingredientId);
    assertTenantOwnership(ingredient, user.tenantId);

    if (args.quantity <= 0) {
      throw new Error("Waste quantity must be greater than zero");
    }

    const previousStock = ingredient.currentStock;
    const newStock = previousStock - args.quantity;

    await ctx.db.patch(args.ingredientId, { currentStock: newStock });

    await ctx.db.insert("inventoryLogs", {
      tenantId: user.tenantId,
      ingredientId: args.ingredientId,
      type: "waste",
      quantityChange: -args.quantity,
      previousStock,
      newStock,
      reason: args.reason ?? "Waste/spoilage",
      performedBy: user.name ?? user.email,
      createdAt: Date.now(),
    });

    // Auto-86 check: if stock drops to 0 or below, mark linked menu items as 86'd
    if (newStock <= 0) {
      await auto86MenuItems(ctx, args.ingredientId);
    }

    return { previousStock, newStock };
  },
});

export const adjustStock = mutation({
  args: {
    ingredientId: v.id("ingredients"),
    newCount: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const ingredient = await ctx.db.get(args.ingredientId);
    assertTenantOwnership(ingredient, user.tenantId);

    if (args.newCount < 0) {
      throw new Error("Stock count cannot be negative");
    }

    const previousStock = ingredient.currentStock;
    const quantityChange = args.newCount - previousStock;

    await ctx.db.patch(args.ingredientId, { currentStock: args.newCount });

    await ctx.db.insert("inventoryLogs", {
      tenantId: user.tenantId,
      ingredientId: args.ingredientId,
      type: "adjustment",
      quantityChange,
      previousStock,
      newStock: args.newCount,
      reason: args.reason ?? "Manual count adjustment",
      performedBy: user.name ?? user.email,
      createdAt: Date.now(),
    });

    // Auto-86 check
    if (args.newCount <= 0) {
      await auto86MenuItems(ctx, args.ingredientId);
    }

    return { previousStock, newStock: args.newCount };
  },
});

// ==================== Internal Helpers ====================

/**
 * When an ingredient's stock drops to 0 or below, find all menu items
 * linked to this ingredient and mark them as 86'd (sold out).
 */
async function auto86MenuItems(
  ctx: { db: any },
  ingredientId: string
) {
  const links = await ctx.db
    .query("menuItemIngredients")
    .withIndex("by_ingredientId", (q: any) => q.eq("ingredientId", ingredientId))
    .collect();

  for (const link of links) {
    const menuItem = await ctx.db.get(link.menuItemId);
    if (menuItem && !menuItem.is86d) {
      await ctx.db.patch(link.menuItemId, {
        is86d: true,
        isAvailable: false,
        updatedAt: Date.now(),
      });
    }
  }
}
