import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Place an online order (no auth required — customer-facing).
 */
export const placeOrder = mutation({
  args: {
    tenantId: v.id("tenants"),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    orderType: v.union(v.literal("pickup"), v.literal("delivery")),
    specialInstructions: v.optional(v.string()),
    items: v.array(
      v.object({
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
      })
    ),
    subtotal: v.number(),
    tax: v.number(),
    tip: v.optional(v.number()),
    total: v.number(),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Generate order number
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
      source: "online",
      status: "sent_to_kitchen",
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      specialInstructions: args.specialInstructions,
      items: args.items,
      subtotal: args.subtotal,
      tax: args.tax,
      tip: args.tip,
      total: args.total,
      paymentStatus: args.stripePaymentIntentId ? "paid" : "unpaid",
      paymentMethod: args.stripePaymentIntentId ? "card" : undefined,
      stripePaymentIntentId: args.stripePaymentIntentId,
      createdAt: now,
      sentToKitchenAt: now,
      updatedAt: now,
    });

    // Create KDS ticket immediately
    const SOURCE_LABELS: Record<string, string> = {
      online: "Online",
    };

    await ctx.db.insert("kdsTickets", {
      tenantId: args.tenantId,
      orderId,
      orderNumber,
      source: "online",
      sourceBadge: "Online",
      status: "new",
      items: args.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        modifiers: item.modifiers?.map((m) => m.name),
        specialInstructions: item.specialInstructions,
        isBumped: false,
      })),
      customerName: args.customerName,
      receivedAt: now,
    });

    // Record payment if Stripe
    if (args.stripePaymentIntentId) {
      await ctx.db.insert("payments", {
        tenantId: args.tenantId,
        orderId,
        amount: args.total,
        method: "card",
        status: "succeeded",
        stripePaymentIntentId: args.stripePaymentIntentId,
        createdAt: now,
      });
    }

    return { orderId, orderNumber };
  },
});
