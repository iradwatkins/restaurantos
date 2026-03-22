import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const createDeliveryRequest = mutation({
  args: {
    tenantId: v.id("tenants"),
    orderId: v.id("orders"),
    provider: v.union(
      v.literal("doordash"),
      v.literal("ubereats"),
      v.literal("grubhub"),
      v.literal("own")
    ),
    externalId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("assigned"),
      v.literal("picked_up"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    driverName: v.optional(v.string()),
    driverPhone: v.optional(v.string()),
    trackingUrl: v.optional(v.string()),
    fee: v.optional(v.number()),
    estimatedPickup: v.optional(v.number()),
    estimatedDropoff: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify the tenant and order exist
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.tenantId !== args.tenantId) throw new Error("Order does not belong to tenant");

    const deliveryId = await ctx.db.insert("deliveries", {
      tenantId: args.tenantId,
      orderId: args.orderId,
      provider: args.provider,
      externalId: args.externalId,
      status: args.status,
      driverName: args.driverName,
      driverPhone: args.driverPhone,
      trackingUrl: args.trackingUrl,
      fee: args.fee,
      estimatedPickup: args.estimatedPickup,
      estimatedDropoff: args.estimatedDropoff,
      createdAt: Date.now(),
    });

    // Sync deliveryStatus on the order
    await ctx.db.patch(args.orderId, {
      deliveryStatus: args.status === "cancelled" ? undefined : args.status,
      updatedAt: Date.now(),
    });

    return deliveryId;
  },
});

export const updateDeliveryStatus = mutation({
  args: {
    externalId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("assigned"),
      v.literal("picked_up"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    driverName: v.optional(v.string()),
    driverPhone: v.optional(v.string()),
    trackingUrl: v.optional(v.string()),
    estimatedPickup: v.optional(v.number()),
    estimatedDropoff: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Find delivery by external ID
    const delivery = await ctx.db
      .query("deliveries")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first();

    if (!delivery) {
      throw new Error(`Delivery not found for externalId: ${args.externalId}`);
    }

    // Build updates, only including fields that were provided
    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.driverName !== undefined) updates.driverName = args.driverName;
    if (args.driverPhone !== undefined) updates.driverPhone = args.driverPhone;
    if (args.trackingUrl !== undefined) updates.trackingUrl = args.trackingUrl;
    if (args.estimatedPickup !== undefined) updates.estimatedPickup = args.estimatedPickup;
    if (args.estimatedDropoff !== undefined) updates.estimatedDropoff = args.estimatedDropoff;

    await ctx.db.patch(delivery._id, updates);

    // Also update the order's deliveryStatus to keep it in sync
    const order = await ctx.db.get(delivery.orderId);
    if (order) {
      // Map delivery status to order delivery status
      const orderDeliveryStatus = args.status === 'cancelled' ? undefined : args.status;
      if (orderDeliveryStatus) {
        await ctx.db.patch(delivery.orderId, {
          deliveryStatus: orderDeliveryStatus,
          updatedAt: Date.now(),
        });
      }
    }

    return delivery._id;
  },
});
