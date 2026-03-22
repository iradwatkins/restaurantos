import { query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { requireTenantAccess } from "../lib/tenant_auth";

/**
 * List all active ingredients for a tenant, with low-stock flag.
 */
export const getIngredients = query({
  args: {
    tenantId: v.id("tenants"),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    let ingredients;
    if (args.category) {
      ingredients = await ctx.db
        .query("ingredients")
        .withIndex("by_tenantId_category", (q) =>
          q.eq("tenantId", args.tenantId).eq("category", args.category)
        )
        .collect();
    } else {
      ingredients = await ctx.db
        .query("ingredients")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
        .collect();
    }

    return ingredients
      .filter((ing) => ing.isActive)
      .map((ing) => ({
        ...ing,
        isLowStock: ing.currentStock < ing.lowStockThreshold,
        isBelowPar: ing.par !== undefined ? ing.currentStock < ing.par : false,
      }));
  },
});

/**
 * Get a single ingredient with its recent log history.
 */
export const getIngredient = query({
  args: {
    ingredientId: v.id("ingredients"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const ingredient = await ctx.db.get(args.ingredientId);
    if (!ingredient) throw new Error("Ingredient not found");
    if (ingredient.tenantId !== user.tenantId) throw new Error("Forbidden");

    // Fetch recent logs for this ingredient (last 100)
    const logs = await ctx.db
      .query("inventoryLogs")
      .withIndex("by_ingredientId_createdAt", (q) =>
        q.eq("ingredientId", args.ingredientId)
      )
      .order("desc")
      .take(100);

    return {
      ...ingredient,
      isLowStock: ingredient.currentStock < ingredient.lowStockThreshold,
      isBelowPar:
        ingredient.par !== undefined
          ? ingredient.currentStock < ingredient.par
          : false,
      logs,
    };
  },
});

/**
 * Get all ingredients currently below their low-stock threshold.
 */
export const getLowStockAlerts = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const ingredients = await ctx.db
      .query("ingredients")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return ingredients
      .filter((ing) => ing.isActive && ing.currentStock < ing.lowStockThreshold)
      .map((ing) => ({
        _id: ing._id,
        name: ing.name,
        unit: ing.unit,
        currentStock: ing.currentStock,
        lowStockThreshold: ing.lowStockThreshold,
        par: ing.par,
        category: ing.category,
        supplier: ing.supplier,
        deficit: ing.lowStockThreshold - ing.currentStock,
      }));
  },
});

/**
 * Get all ingredients linked to a specific menu item.
 */
export const getMenuItemIngredients = query({
  args: {
    menuItemId: v.id("menuItems"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const menuItem = await ctx.db.get(args.menuItemId);
    if (!menuItem) throw new Error("Menu item not found");
    if (menuItem.tenantId !== user.tenantId) throw new Error("Forbidden");

    const links = await ctx.db
      .query("menuItemIngredients")
      .withIndex("by_menuItemId", (q) => q.eq("menuItemId", args.menuItemId))
      .collect();

    // Hydrate each link with ingredient details
    const result = [];
    for (const link of links) {
      const ingredient = await ctx.db.get(link.ingredientId);
      if (ingredient) {
        result.push({
          linkId: link._id,
          quantity: link.quantity,
          ingredient: {
            _id: ingredient._id,
            name: ingredient.name,
            unit: ingredient.unit,
            currentStock: ingredient.currentStock,
            costPerUnit: ingredient.costPerUnit,
            isLowStock: ingredient.currentStock < ingredient.lowStockThreshold,
            isActive: ingredient.isActive,
          },
        });
      }
    }

    return result;
  },
});

/**
 * Get waste log entries for a date range.
 */
export const getWasteLog = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(), // epoch ms
    endDate: v.number(), // epoch ms
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const logs = await ctx.db
      .query("inventoryLogs")
      .withIndex("by_tenantId_createdAt", (q) =>
        q
          .eq("tenantId", args.tenantId)
          .gte("createdAt", args.startDate)
          .lte("createdAt", args.endDate)
      )
      .collect();

    const wasteLogs = logs.filter((log) => log.type === "waste");

    // Hydrate with ingredient names
    const result = [];
    for (const log of wasteLogs) {
      const ingredient = await ctx.db.get(log.ingredientId);
      result.push({
        ...log,
        ingredientName: ingredient?.name ?? "Unknown",
        ingredientUnit: ingredient?.unit ?? "",
        // Waste cost = |quantityChange| * costPerUnit
        wasteCostCents: ingredient
          ? Math.abs(log.quantityChange) * ingredient.costPerUnit
          : 0,
      });
    }

    // Sort by most recent first
    result.sort((a, b) => b.createdAt - a.createdAt);

    return result;
  },
});

/**
 * Food cost report: for each menu item with linked ingredients,
 * calculate total ingredient cost vs selling price = food cost %.
 */
export const getFoodCostReport = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    // Get all menu item ingredient links for this tenant
    const allLinks = await ctx.db
      .query("menuItemIngredients")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Group links by menuItemId
    const linksByMenuItem = new Map<Id<"menuItems">, typeof allLinks>();
    for (const link of allLinks) {
      const existing = linksByMenuItem.get(link.menuItemId);
      if (existing) {
        existing.push(link);
      } else {
        linksByMenuItem.set(link.menuItemId, [link]);
      }
    }

    const report = [];

    for (const [menuItemId, links] of linksByMenuItem.entries()) {
      const menuItem = await ctx.db.get(menuItemId);
      if (!menuItem || !menuItem.isAvailable) continue;

      let totalIngredientCostCents = 0;
      const ingredientBreakdown = [];

      for (const link of links) {
        const ingredient = await ctx.db.get(link.ingredientId);
        if (!ingredient) continue;

        const costCents = link.quantity * ingredient.costPerUnit;
        totalIngredientCostCents += costCents;

        ingredientBreakdown.push({
          ingredientName: ingredient.name,
          quantity: link.quantity,
          unit: ingredient.unit,
          costPerUnit: ingredient.costPerUnit,
          lineCostCents: costCents,
        });
      }

      const sellingPriceCents = menuItem.price;
      const foodCostPercent =
        sellingPriceCents > 0
          ? Math.round((totalIngredientCostCents / sellingPriceCents) * 10000) /
            100
          : 0;

      report.push({
        menuItemId: menuItem._id,
        menuItemName: menuItem.name,
        sellingPriceCents,
        totalIngredientCostCents,
        foodCostPercent,
        profitCents: sellingPriceCents - totalIngredientCostCents,
        ingredientBreakdown,
      });
    }

    // Sort by food cost % descending (highest cost items first)
    report.sort((a, b) => b.foodCostPercent - a.foodCostPercent);

    return report;
  },
});
