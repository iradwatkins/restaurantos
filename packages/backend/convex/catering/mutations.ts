import { mutation } from "../_generated/server";
import { v } from "convex/values";

// ==================== Categories ====================

export const createCategory = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
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
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const deleteItem = mutation({
  args: { id: v.id("cateringMenuItems") },
  handler: async (ctx, args) => {
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
    await ctx.db.patch(args.id, {
      balancePaidAt: Date.now(),
      balanceStripePaymentIntentId: args.stripePaymentIntentId,
      updatedAt: Date.now(),
    });
  },
});

// ==================== Public: Place Catering Order ====================

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

    // Generate order number
    const existing = await ctx.db
      .query("cateringOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    const orderNumber = existing.length + 1;

    // Deposit = 50% of total
    const depositRequired = Math.round(args.total * 0.5);

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
      items: args.items,
      subtotal: args.subtotal,
      tax: args.tax,
      total: args.total,
      depositRequired,
      balanceDue: args.total - depositRequired,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return { orderId, orderNumber, depositRequired };
  },
});
