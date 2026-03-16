import { mutation } from "../_generated/server";
import { v } from "convex/values";

const SOURCE_LABELS: Record<string, string> = {
  doordash: "DoorDash",
  ubereats: "Uber Eats",
  grubhub: "Grubhub",
};

/**
 * Ingest a delivery order from KitchenHub webhook.
 * Normalizes the payload into a RestaurantOS order and creates a KDS ticket.
 */
export const ingestDeliveryOrder = mutation({
  args: {
    tenantId: v.id("tenants"),
    platform: v.string(),
    externalOrderId: v.string(),
    customerName: v.optional(v.string()),
    estimatedPickupTime: v.optional(v.number()),
    items: v.array(
      v.object({
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
      })
    ),
    subtotal: v.number(),
    tax: v.number(),
    total: v.number(),
    rawPayload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Log the webhook
    const logId = await ctx.db.insert("webhookLogs", {
      tenantId: args.tenantId,
      platform: args.platform,
      eventType: "order.created",
      externalOrderId: args.externalOrderId,
      status: "received",
      payload: args.rawPayload,
      receivedAt: now,
    });

    try {
      // Map platform to order source
      const source = args.platform as
        | "doordash"
        | "ubereats"
        | "grubhub";

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

      // Create order with denormalized items
      const orderItems = args.items.map((item) => ({
        menuItemId: "" as any, // external items don't have menu item IDs
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        modifiers: item.modifiers,
        specialInstructions: item.specialInstructions,
        lineTotal:
          item.unitPrice * item.quantity +
          (item.modifiers?.reduce(
            (sum, m) => sum + m.priceAdjustment * item.quantity,
            0
          ) ?? 0),
      }));

      const orderId = await ctx.db.insert("orders", {
        tenantId: args.tenantId,
        orderNumber,
        source,
        status: "sent_to_kitchen",
        customerName: args.customerName,
        items: orderItems,
        subtotal: args.subtotal,
        tax: args.tax,
        total: args.total,
        paymentStatus: "paid", // delivery orders are pre-paid
        externalOrderId: args.externalOrderId,
        estimatedPickupTime: args.estimatedPickupTime,
        createdAt: now,
        sentToKitchenAt: now,
        updatedAt: now,
      });

      // Create KDS ticket immediately
      const ticketItems = args.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        modifiers: item.modifiers?.map((m) => m.name),
        specialInstructions: item.specialInstructions,
        isBumped: false,
      }));

      await ctx.db.insert("kdsTickets", {
        tenantId: args.tenantId,
        orderId,
        orderNumber,
        source,
        sourceBadge: SOURCE_LABELS[source] ?? source,
        status: "new",
        items: ticketItems,
        customerName: args.customerName,
        estimatedPickupTime: args.estimatedPickupTime,
        receivedAt: now,
      });

      // Mark webhook as processed
      await ctx.db.patch(logId, {
        status: "processed",
        processedAt: Date.now(),
      });

      return { orderId, orderNumber };
    } catch (error: any) {
      // Mark webhook as failed
      await ctx.db.patch(logId, {
        status: "failed",
        errorMessage: error.message,
        processedAt: Date.now(),
      });

      throw error;
    }
  },
});

/**
 * Log a webhook event (for non-order events like status updates).
 */
export const logWebhookEvent = mutation({
  args: {
    tenantId: v.id("tenants"),
    platform: v.string(),
    eventType: v.string(),
    externalOrderId: v.optional(v.string()),
    payload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("webhookLogs", {
      ...args,
      status: "received",
      receivedAt: Date.now(),
    });
  },
});
