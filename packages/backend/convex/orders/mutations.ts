import { mutation } from "../_generated/server";
import { v } from "convex/values";

const orderItemValidator = v.object({
  menuItemId: v.id("menuItems"),
  name: v.string(),
  quantity: v.number(),
  unitPrice: v.number(),
  modifiers: v.optional(
    v.array(
      v.object({
        name: v.string(),
        priceAdjustment: v.number(),
      })
    )
  ),
  specialInstructions: v.optional(v.string()),
  lineTotal: v.number(),
});

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    source: v.union(
      v.literal("dine_in"),
      v.literal("online"),
      v.literal("doordash"),
      v.literal("ubereats"),
      v.literal("grubhub")
    ),
    tableId: v.optional(v.id("tables")),
    tableName: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    specialInstructions: v.optional(v.string()),
    items: v.array(orderItemValidator),
    subtotal: v.number(),
    tax: v.number(),
    tip: v.optional(v.number()),
    total: v.number(),
    serverId: v.optional(v.id("users")),
    serverName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate order number (simple sequential per tenant)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    const todayOrders = await ctx.db
      .query("orders")
      .withIndex("by_tenantId_createdAt", (q) =>
        q.eq("tenantId", args.tenantId).gte("createdAt", todayStart)
      )
      .collect();

    const orderNumber = todayOrders.length + 1;

    const orderId = await ctx.db.insert("orders", {
      tenantId: args.tenantId,
      orderNumber,
      source: args.source,
      status: "open",
      tableId: args.tableId,
      tableName: args.tableName,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      specialInstructions: args.specialInstructions,
      items: args.items,
      subtotal: args.subtotal,
      tax: args.tax,
      tip: args.tip,
      total: args.total,
      paymentStatus: "unpaid",
      serverId: args.serverId,
      serverName: args.serverName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // If dine-in, update table status
    if (args.tableId) {
      await ctx.db.patch(args.tableId, {
        status: "occupied",
        currentOrderId: orderId,
      });
    }

    return orderId;
  },
});

export const addItems = mutation({
  args: {
    orderId: v.id("orders"),
    items: v.array(orderItemValidator),
    newSubtotal: v.number(),
    newTax: v.number(),
    newTotal: v.number(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.status === "completed" || order.status === "cancelled") {
      throw new Error("Cannot modify a completed or cancelled order");
    }

    const allItems = [...order.items, ...args.items];

    await ctx.db.patch(args.orderId, {
      items: allItems,
      subtotal: args.newSubtotal,
      tax: args.newTax,
      total: args.newTotal,
      updatedAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("open"),
      v.literal("sent_to_kitchen"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const updates: Record<string, any> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.status === "sent_to_kitchen") {
      updates.sentToKitchenAt = Date.now();

      // Auto-create KDS ticket
      const existing = await ctx.db
        .query("kdsTickets")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
        .first();

      if (!existing) {
        const SOURCE_LABELS: Record<string, string> = {
          dine_in: "Dine-In",
          online: "Online",
          doordash: "DoorDash",
          ubereats: "Uber Eats",
          grubhub: "Grubhub",
        };

        await ctx.db.insert("kdsTickets", {
          tenantId: order.tenantId,
          orderId: args.orderId,
          orderNumber: order.orderNumber,
          source: order.source,
          sourceBadge: SOURCE_LABELS[order.source] ?? order.source,
          status: "new",
          items: order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            modifiers: item.modifiers?.map((m) => m.name),
            specialInstructions: item.specialInstructions,
            isBumped: false,
          })),
          tableName: order.tableName,
          customerName: order.customerName,
          estimatedPickupTime: order.estimatedPickupTime,
          receivedAt: Date.now(),
        });
      }
    }
    if (args.status === "completed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.orderId, updates);

    // Free table on completion/cancellation
    if (
      (args.status === "completed" || args.status === "cancelled") &&
      order.tableId
    ) {
      await ctx.db.patch(order.tableId, {
        status: "open",
        currentOrderId: undefined,
      });
    }
  },
});

export const recordPayment = mutation({
  args: {
    tenantId: v.id("tenants"),
    orderId: v.id("orders"),
    amount: v.number(),
    method: v.union(v.literal("card"), v.literal("cash")),
    stripePaymentIntentId: v.optional(v.string()),
    stripeChargeId: v.optional(v.string()),
    cashReceived: v.optional(v.number()),
    changeGiven: v.optional(v.number()),
    tip: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    // Create payment record
    const paymentId = await ctx.db.insert("payments", {
      tenantId: args.tenantId,
      orderId: args.orderId,
      amount: args.amount,
      method: args.method,
      status: "succeeded",
      stripePaymentIntentId: args.stripePaymentIntentId,
      stripeChargeId: args.stripeChargeId,
      cashReceived: args.cashReceived,
      changeGiven: args.changeGiven,
      tip: args.tip,
      createdAt: Date.now(),
    });

    // Check total payments
    const allPayments = await ctx.db
      .query("payments")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    // Update order payment status
    const paymentStatus = totalPaid >= order.total ? "paid" : "partial";
    await ctx.db.patch(args.orderId, {
      paymentStatus,
      paymentMethod: args.method,
      stripePaymentIntentId: args.stripePaymentIntentId,
      tip: args.tip ?? order.tip,
      updatedAt: Date.now(),
    });

    return paymentId;
  },
});

// ==================== Table Management ====================

export const createTable = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    seats: v.optional(v.number()),
    section: v.optional(v.string()),
    posX: v.optional(v.number()),
    posY: v.optional(v.number()),
    shape: v.optional(v.union(v.literal("square"), v.literal("round"), v.literal("rectangle"))),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tables", {
      ...args,
      status: "open",
      createdAt: Date.now(),
    });
  },
});

export const updateTableStatus = mutation({
  args: {
    tableId: v.id("tables"),
    status: v.union(
      v.literal("open"),
      v.literal("occupied"),
      v.literal("reserved"),
      v.literal("closing")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tableId, { status: args.status });
  },
});
