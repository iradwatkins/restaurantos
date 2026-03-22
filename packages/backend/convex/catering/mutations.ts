import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { requireTenantAccess, assertTenantOwnership } from "../lib/tenant_auth";

// ==================== Categories ====================

export const createCategory = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot manage catering for another tenant");
    }

    const existing = await ctx.db
      .query("cateringCategories")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return await ctx.db.insert("cateringCategories", {
      tenantId: args.tenantId,
      name: args.name,
      sortOrder: existing.length,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateCategory = mutation({
  args: {
    id: v.id("cateringCategories"),
    name: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const category = await ctx.db.get(args.id);
    assertTenantOwnership(category, currentUser.tenantId);
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

// ==================== Menu Items ====================

export const createItem = mutation({
  args: {
    tenantId: v.id("tenants"),
    categoryId: v.id("cateringCategories"),
    name: v.string(),
    description: v.optional(v.string()),
    servingSize: v.string(),
    pricePerPerson: v.optional(v.number()),
    flatPrice: v.optional(v.number()),
    minimumQuantity: v.optional(v.number()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot manage catering for another tenant");
    }

    return await ctx.db.insert("cateringMenuItems", {
      ...args,
      isAvailable: true,
      sortOrder: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateItem = mutation({
  args: {
    id: v.id("cateringMenuItems"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    servingSize: v.optional(v.string()),
    pricePerPerson: v.optional(v.number()),
    flatPrice: v.optional(v.number()),
    minimumQuantity: v.optional(v.number()),
    isAvailable: v.optional(v.boolean()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const item = await ctx.db.get(args.id);
    assertTenantOwnership(item, currentUser.tenantId);
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const deleteItem = mutation({
  args: { id: v.id("cateringMenuItems") },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const item = await ctx.db.get(args.id);
    assertTenantOwnership(item, currentUser.tenantId);
    await ctx.db.delete(args.id);
  },
});

// ==================== Orders ====================

export const updateOrderStatus = mutation({
  args: {
    id: v.id("cateringOrders"),
    status: v.union(
      v.literal("inquiry"),
      v.literal("confirmed"),
      v.literal("deposit_paid"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const order = await ctx.db.get(args.id);
    assertTenantOwnership(order, currentUser.tenantId);
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const recordDeposit = mutation({
  args: {
    id: v.id("cateringOrders"),
    amount: v.number(),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const order = await ctx.db.get(args.id);
    assertTenantOwnership(order, currentUser.tenantId);
    await ctx.db.patch(args.id, {
      depositPaid: args.amount,
      depositPaidAt: Date.now(),
      depositStripePaymentIntentId: args.stripePaymentIntentId,
      status: "deposit_paid",
      updatedAt: Date.now(),
    });
  },
});

export const recordBalancePayment = mutation({
  args: {
    id: v.id("cateringOrders"),
    amount: v.number(),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const order = await ctx.db.get(args.id);
    assertTenantOwnership(order, currentUser.tenantId);
    await ctx.db.patch(args.id, {
      balancePaidAt: Date.now(),
      balanceStripePaymentIntentId: args.stripePaymentIntentId,
      updatedAt: Date.now(),
    });
  },
});

// ==================== Public: Place Catering Order ====================

/**
 * Place a catering order (no auth required — customer-facing).
 * All prices are verified server-side from the database.
 * Client-supplied price fields are ignored for calculations.
 */
export const placeCateringOrder = mutation({
  args: {
    tenantId: v.id("tenants"),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    eventDate: v.number(),
    eventTime: v.string(),
    headcount: v.number(),
    fulfillmentType: v.union(v.literal("pickup"), v.literal("delivery")),
    deliveryAddress: v.optional(
      v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zip: v.string(),
      })
    ),
    items: v.array(
      v.object({
        cateringMenuItemId: v.id("cateringMenuItems"),
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        lineTotal: v.number(),
      })
    ),
    subtotal: v.number(),
    tax: v.number(),
    total: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // ── Verify tenant exists and is active ──
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant || tenant.status !== "active") {
      throw new Error("Restaurant is not currently accepting catering orders");
    }

    if (args.items.length === 0) {
      throw new Error("Order must contain at least one item");
    }

    // ── Server-side price verification ──
    // Look up every catering menu item from the database and recalculate all prices.
    // Client-supplied unitPrice, lineTotal, subtotal, tax, and total are ignored.

    const verifiedItems: Array<{
      cateringMenuItemId: Id<"cateringMenuItems">;
      name: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }> = [];

    let serverSubtotal = 0;

    for (const clientItem of args.items) {
      const menuItem = await ctx.db.get(clientItem.cateringMenuItemId);
      if (!menuItem) {
        throw new Error(`Catering menu item not found: ${clientItem.cateringMenuItemId}`);
      }
      if (menuItem.tenantId !== args.tenantId) {
        throw new Error("Catering menu item does not belong to this restaurant");
      }
      if (!menuItem.isAvailable) {
        throw new Error(`"${menuItem.name}" is currently unavailable`);
      }
      if (clientItem.quantity < 1 || !Number.isInteger(clientItem.quantity)) {
        throw new Error(`Invalid quantity for "${menuItem.name}"`);
      }
      if (menuItem.minimumQuantity && clientItem.quantity < menuItem.minimumQuantity) {
        throw new Error(
          `"${menuItem.name}" requires a minimum quantity of ${menuItem.minimumQuantity}`
        );
      }

      // Use the database price, not the client-supplied price.
      // Catering items can have either pricePerPerson or flatPrice.
      let serverUnitPrice: number;
      if (menuItem.pricePerPerson !== undefined && menuItem.pricePerPerson !== null) {
        serverUnitPrice = menuItem.pricePerPerson;
      } else if (menuItem.flatPrice !== undefined && menuItem.flatPrice !== null) {
        serverUnitPrice = menuItem.flatPrice;
      } else {
        throw new Error(`"${menuItem.name}" has no price configured`);
      }

      const serverLineTotal = serverUnitPrice * clientItem.quantity;
      serverSubtotal += serverLineTotal;

      verifiedItems.push({
        cateringMenuItemId: clientItem.cateringMenuItemId,
        name: menuItem.name,
        quantity: clientItem.quantity,
        unitPrice: serverUnitPrice,
        lineTotal: serverLineTotal,
      });
    }

    // Calculate tax from the tenant's configured tax rate
    const taxRate = tenant.taxRate ?? 0;
    const serverTax = Math.round(serverSubtotal * taxRate);
    const serverTotal = serverSubtotal + serverTax;

    // Generate order number
    const existing = await ctx.db
      .query("cateringOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    const orderNumber = existing.length + 1;

    // Deposit = 50% of server-calculated total
    const depositRequired = Math.round(serverTotal * 0.5);

    const orderId = await ctx.db.insert("cateringOrders", {
      tenantId: args.tenantId,
      orderNumber,
      status: "inquiry",
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      eventDate: args.eventDate,
      eventTime: args.eventTime,
      headcount: args.headcount,
      fulfillmentType: args.fulfillmentType,
      deliveryAddress: args.deliveryAddress,
      items: verifiedItems,
      subtotal: serverSubtotal,
      tax: serverTax,
      total: serverTotal,
      depositRequired,
      balanceDue: serverTotal - depositRequired,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return { orderId, orderNumber, depositRequired };
  },
});
