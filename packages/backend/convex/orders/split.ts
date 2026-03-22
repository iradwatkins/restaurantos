import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { validateSplitTotal } from "../lib/split_utils";

export const splitPayment = mutation({
  args: {
    tenantId: v.id("tenants"),
    orderId: v.id("orders"),
    splits: v.array(
      v.object({
        amount: v.number(),
        method: v.union(v.literal("card"), v.literal("cash")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.tenantId !== args.tenantId) {
      throw new Error("Order does not belong to this tenant");
    }

    // Verify total of all splits equals order total
    validateSplitTotal(args.splits, order.total);

    // Insert a payment record for each split
    const now = Date.now();
    const paymentIds = [];

    for (const split of args.splits) {
      const paymentId = await ctx.db.insert("payments", {
        tenantId: args.tenantId,
        orderId: args.orderId,
        amount: split.amount,
        method: split.method,
        status: "succeeded",
        createdAt: now,
      });
      paymentIds.push(paymentId);
    }

    // Update order payment status
    await ctx.db.patch(args.orderId, {
      paymentStatus: "paid",
      paymentMethod: "split",
      updatedAt: now,
    });

    return paymentIds;
  },
});
