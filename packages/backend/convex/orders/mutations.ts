import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { requireTenantAccess } from "../lib/tenant_auth";

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
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot create orders for another tenant");
    }

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

    // ── Inventory: auto-deduct ingredients for each item ──
    await deductInventoryForOrder(ctx, args.tenantId, args.items, orderId);

    // ── Loyalty: auto-earn points if customer has a loyalty account ──
    await autoEarnLoyaltyPoints(ctx, args.tenantId, orderId, args.subtotal, args.customerEmail, args.customerPhone);

    return { orderId, orderNumber };
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
    tipAmount: v.optional(v.number()),
    tipMethod: v.optional(v.union(v.literal("cash"), v.literal("card"))),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot record payment for another tenant");
    }

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.tenantId !== args.tenantId) {
      throw new Error("Forbidden: order belongs to another tenant");
    }

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

    // Update order payment status and tip fields
    const paymentStatus = totalPaid >= order.total ? "paid" : "partial";
    const orderPatch: Record<string, unknown> = {
      paymentStatus,
      paymentMethod: args.method,
      stripePaymentIntentId: args.stripePaymentIntentId,
      tip: args.tip ?? order.tip,
      updatedAt: Date.now(),
    };

    // Store structured tip data on the order when provided
    if (args.tipAmount !== undefined) {
      orderPatch.tipAmount = args.tipAmount;
    }
    if (args.tipMethod !== undefined) {
      orderPatch.tipMethod = args.tipMethod;
    }

    await ctx.db.patch(args.orderId, orderPatch);

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
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot create tables for another tenant");
    }

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

// ==================== Discounts, Voids, Comps ====================

export const applyDiscount = mutation({
  args: {
    orderId: v.id("orders"),
    discountId: v.optional(v.id("discounts")),
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
    discountValue: v.number(),
    discountReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.tenantId !== currentUser.tenantId) {
      throw new Error("Forbidden: order belongs to another tenant");
    }
    if (order.status === "completed" || order.status === "cancelled") {
      throw new Error("Cannot apply discount to a completed or cancelled order");
    }
    if (order.isComped) {
      throw new Error("Cannot apply discount to a comped order");
    }

    // If a preset discount is referenced, validate it exists and belongs to tenant
    if (args.discountId) {
      const discount = await ctx.db.get(args.discountId);
      if (!discount) throw new Error("Discount not found");
      if (discount.tenantId !== currentUser.tenantId) {
        throw new Error("Forbidden: discount belongs to another tenant");
      }
      if (!discount.isActive) {
        throw new Error("Discount is not active");
      }
    }

    // Calculate the active subtotal (excluding voided items)
    const activeSubtotal = order.items.reduce((sum, item) => {
      if (item.isVoided) return sum;
      return sum + item.lineTotal;
    }, 0);

    let discountAmount: number;
    if (args.discountType === "percentage") {
      discountAmount = Math.round(activeSubtotal * args.discountValue / 100);
    } else {
      // Fixed discount capped at active subtotal
      discountAmount = Math.min(args.discountValue, activeSubtotal);
    }

    const newTotal = Math.max(0, activeSubtotal - discountAmount + order.tax);

    await ctx.db.patch(args.orderId, {
      discountId: args.discountId,
      discountType: args.discountType,
      discountValue: args.discountValue,
      discountAmount,
      discountReason: args.discountReason,
      subtotal: activeSubtotal,
      total: newTotal,
      updatedAt: Date.now(),
    });

    return { discountAmount, newTotal };
  },
});

export const removeDiscount = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.tenantId !== currentUser.tenantId) {
      throw new Error("Forbidden: order belongs to another tenant");
    }
    if (order.status === "completed" || order.status === "cancelled") {
      throw new Error("Cannot modify a completed or cancelled order");
    }

    // Recalculate subtotal from non-voided items
    const activeSubtotal = order.items.reduce((sum, item) => {
      if (item.isVoided) return sum;
      return sum + item.lineTotal;
    }, 0);

    const newTotal = activeSubtotal + order.tax;

    await ctx.db.patch(args.orderId, {
      discountId: undefined,
      discountType: undefined,
      discountValue: undefined,
      discountAmount: undefined,
      discountReason: undefined,
      isComped: undefined,
      compedBy: undefined,
      subtotal: activeSubtotal,
      total: newTotal,
      updatedAt: Date.now(),
    });

    return { newTotal };
  },
});

export const voidItem = mutation({
  args: {
    orderId: v.id("orders"),
    itemIndex: v.number(),
    voidReason: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.tenantId !== currentUser.tenantId) {
      throw new Error("Forbidden: order belongs to another tenant");
    }
    if (order.status === "completed" || order.status === "cancelled") {
      throw new Error("Cannot void items on a completed or cancelled order");
    }
    if (args.itemIndex < 0 || args.itemIndex >= order.items.length) {
      throw new Error("Invalid item index");
    }

    const targetItem = order.items[args.itemIndex];
    if (!targetItem) {
      throw new Error("Invalid item index");
    }
    if (targetItem.isVoided) {
      throw new Error("Item is already voided");
    }

    // Mark the item as voided
    const updatedItems = order.items.map((item, idx) => {
      if (idx === args.itemIndex) {
        return {
          ...item,
          isVoided: true,
          voidedBy: currentUser.name ?? currentUser.email,
          voidReason: args.voidReason,
        };
      }
      return item;
    });

    // Recalculate subtotal excluding voided items
    const newSubtotal = updatedItems.reduce((sum, item) => {
      if (item.isVoided) return sum;
      return sum + item.lineTotal;
    }, 0);

    // Recalculate tax proportionally
    const originalSubtotal = order.items.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxRate = originalSubtotal > 0 ? order.tax / originalSubtotal : 0;
    const newTax = Math.round(newSubtotal * taxRate);

    // Recalculate discount if one exists
    let discountAmount = order.discountAmount ?? 0;
    if (order.discountType === "percentage" && order.discountValue !== undefined) {
      discountAmount = Math.round(newSubtotal * order.discountValue / 100);
    } else if (order.discountType === "fixed" && order.discountValue !== undefined) {
      discountAmount = Math.min(order.discountValue, newSubtotal);
    }

    const newTotal = Math.max(0, newSubtotal - discountAmount + newTax);

    await ctx.db.patch(args.orderId, {
      items: updatedItems,
      subtotal: newSubtotal,
      tax: newTax,
      discountAmount: order.discountType ? discountAmount : undefined,
      total: order.isComped ? 0 : newTotal,
      updatedAt: Date.now(),
    });

    return { voidedItem: targetItem.name, newSubtotal, newTotal: order.isComped ? 0 : newTotal };
  },
});

export const compOrder = mutation({
  args: {
    orderId: v.id("orders"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.tenantId !== currentUser.tenantId) {
      throw new Error("Forbidden: order belongs to another tenant");
    }
    if (order.status === "completed" || order.status === "cancelled") {
      throw new Error("Cannot comp a completed or cancelled order");
    }
    if (order.isComped) {
      throw new Error("Order is already comped");
    }

    // Recalculate active subtotal (excluding voided items)
    const activeSubtotal = order.items.reduce((sum, item) => {
      if (item.isVoided) return sum;
      return sum + item.lineTotal;
    }, 0);

    await ctx.db.patch(args.orderId, {
      isComped: true,
      compedBy: currentUser.name ?? currentUser.email,
      discountType: "comp",
      discountAmount: activeSubtotal,
      discountReason: args.reason,
      total: 0,
      updatedAt: Date.now(),
    });

    return { compedAmount: activeSubtotal };
  },
});

// ==================== Inventory Auto-Deduct Helper ====================

/**
 * Deduct inventory for each ordered item.
 * For each line item, look up its linked ingredients, deduct stock, log it,
 * and auto-86 menu items when ingredient stock reaches 0.
 */
async function deductInventoryForOrder(
  ctx: { db: any },
  tenantId: Id<"tenants">,
  items: Array<{ menuItemId: Id<"menuItems">; quantity: number }>,
  orderId: Id<"orders">
) {
  const now = Date.now();

  for (const item of items) {
    const links = await ctx.db
      .query("menuItemIngredients")
      .withIndex("by_menuItemId", (q: any) => q.eq("menuItemId", item.menuItemId))
      .collect();

    for (const link of links) {
      const ingredient = await ctx.db.get(link.ingredientId);
      if (!ingredient || !ingredient.isActive) continue;

      const deductAmount = link.quantity * item.quantity;
      const previousStock = ingredient.currentStock;
      const newStock = previousStock - deductAmount;

      await ctx.db.patch(link.ingredientId, { currentStock: newStock });

      await ctx.db.insert("inventoryLogs", {
        tenantId,
        ingredientId: link.ingredientId,
        type: "order_deduction" as const,
        quantityChange: -deductAmount,
        previousStock,
        newStock,
        orderId,
        reason: "Order deduction",
        createdAt: now,
      });

      // Auto-86: if stock <= 0, mark all linked menu items as sold out
      if (newStock <= 0) {
        const allLinksForIngredient = await ctx.db
          .query("menuItemIngredients")
          .withIndex("by_ingredientId", (q: any) =>
            q.eq("ingredientId", link.ingredientId)
          )
          .collect();

        for (const affectedLink of allLinksForIngredient) {
          const menuItem = await ctx.db.get(affectedLink.menuItemId);
          if (menuItem && !menuItem.is86d) {
            await ctx.db.patch(affectedLink.menuItemId, {
              is86d: true,
              isAvailable: false,
              updatedAt: now,
            });
          }
        }
      }
    }
  }
}

// ==================== Loyalty Auto-Earn Helper ====================

/**
 * Automatically earn loyalty points for a customer after an order is created.
 * Looks up the customer by email or phone, finds their loyalty account,
 * and awards points based on the active program rules.
 */
async function autoEarnLoyaltyPoints(
  ctx: { db: any },
  tenantId: Id<"tenants">,
  orderId: Id<"orders">,
  subtotal: number,
  customerEmail?: string,
  customerPhone?: string
) {
  // Need at least one identifier to look up the customer
  if (!customerEmail && !customerPhone) return;

  // Find the active loyalty program
  const programs = await ctx.db
    .query("loyaltyPrograms")
    .withIndex("by_tenantId", (q: any) => q.eq("tenantId", tenantId))
    .collect();

  const activeProgram = programs.find((p: any) => p.isActive);
  if (!activeProgram) return;

  // Find the customer by phone or email
  let customer = null;
  if (customerPhone) {
    customer = await ctx.db
      .query("customers")
      .withIndex("by_tenantId_phone", (q: any) =>
        q.eq("tenantId", tenantId).eq("phone", customerPhone)
      )
      .first();
  }
  if (!customer && customerEmail) {
    customer = await ctx.db
      .query("customers")
      .withIndex("by_tenantId_email", (q: any) =>
        q.eq("tenantId", tenantId).eq("email", customerEmail)
      )
      .first();
  }
  if (!customer) return;

  // Find the customer's loyalty account
  const loyaltyAccount = await ctx.db
    .query("loyaltyAccounts")
    .withIndex("by_tenantId_customerId", (q: any) =>
      q.eq("tenantId", tenantId).eq("customerId", customer._id)
    )
    .first();

  if (!loyaltyAccount) return;

  // Calculate points
  const orderDollars = subtotal / 100;
  let basePoints = Math.floor(orderDollars * activeProgram.pointsPerDollar);

  // Apply tier multiplier
  let multiplier = 1;
  if (loyaltyAccount.currentTier && activeProgram.tiers) {
    const currentTier = activeProgram.tiers.find(
      (t: any) => t.name === loyaltyAccount.currentTier
    );
    if (currentTier) {
      multiplier = currentTier.multiplier;
    }
  }

  const earnedPoints = Math.floor(basePoints * multiplier);
  if (earnedPoints <= 0) return;

  const newCurrentPoints = loyaltyAccount.currentPoints + earnedPoints;
  const newLifetimePoints = loyaltyAccount.lifetimePoints + earnedPoints;

  // Determine new tier
  let newTier: string | undefined = loyaltyAccount.currentTier;
  if (activeProgram.tiers && activeProgram.tiers.length > 0) {
    const sortedTiers = [...activeProgram.tiers].sort(
      (a: any, b: any) => b.minPoints - a.minPoints
    );
    const qualifyingTier = sortedTiers.find(
      (t: any) => newLifetimePoints >= t.minPoints
    );
    newTier = qualifyingTier?.name;
  }

  await ctx.db.patch(loyaltyAccount._id, {
    currentPoints: newCurrentPoints,
    lifetimePoints: newLifetimePoints,
    currentTier: newTier,
  });

  // Fetch order for order number
  const order = await ctx.db.get(orderId);
  const orderNumber = order?.orderNumber ?? 0;

  await ctx.db.insert("loyaltyTransactions", {
    tenantId,
    accountId: loyaltyAccount._id,
    orderId,
    type: "earn" as const,
    points: earnedPoints,
    description: `Earned ${earnedPoints} points from order #${orderNumber}`,
    createdAt: Date.now(),
  });
}
