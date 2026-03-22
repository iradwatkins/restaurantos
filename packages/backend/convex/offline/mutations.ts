import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";

const offlineOrderItemValidator = v.object({
  menuItemId: v.id("menuItems"),
  name: v.string(),
  quantity: v.number(),
  unitPrice: v.number(), // cents
  modifiers: v.optional(
    v.array(
      v.object({
        name: v.string(),
        priceAdjustment: v.number(), // cents
      })
    )
  ),
  specialInstructions: v.optional(v.string()),
  lineTotal: v.number(), // cents
});

const offlineOrderValidator = v.object({
  offlineId: v.string(),
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
  items: v.array(offlineOrderItemValidator),
  subtotal: v.number(), // cents
  tax: v.number(), // cents
  tip: v.optional(v.number()), // cents
  total: v.number(), // cents
  orderType: v.optional(
    v.union(v.literal("pickup"), v.literal("delivery"), v.literal("dine_in"))
  ),
  timestamp: v.number(), // epoch ms — when the order was created offline
  serverId: v.optional(v.id("users")),
  serverName: v.optional(v.string()),
});

/**
 * Sync offline orders to the server.
 * Processes each order through creation, with deduplication via offlineId.
 * Returns per-order success/fail results so the client can retry failures.
 */
export const syncOfflineOrders = mutation({
  args: {
    tenantId: v.id("tenants"),
    orders: v.array(offlineOrderValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const results: Array<{
      offlineId: string;
      success: boolean;
      orderId: string | null;
      orderNumber: number | null;
      error: string | null;
    }> = [];

    for (const offlineOrder of args.orders) {
      try {
        // Dedup: check if an order with this offlineId already exists
        const existing = await ctx.db
          .query("orders")
          .withIndex("by_tenantId_offlineId", (q) =>
            q.eq("tenantId", args.tenantId).eq("offlineId", offlineOrder.offlineId)
          )
          .first();

        if (existing) {
          // Already synced — return success with existing data
          results.push({
            offlineId: offlineOrder.offlineId,
            success: true,
            orderId: existing._id,
            orderNumber: existing.orderNumber,
            error: null,
          });
          continue;
        }

        // Generate order number using the offline timestamp's date
        const orderDate = new Date(offlineOrder.timestamp);
        orderDate.setHours(0, 0, 0, 0);
        const dayStart = orderDate.getTime();

        const dayOrders = await ctx.db
          .query("orders")
          .withIndex("by_tenantId_createdAt", (q) =>
            q.eq("tenantId", args.tenantId).gte("createdAt", dayStart)
          )
          .collect();

        const orderNumber = dayOrders.length + 1;

        const orderId = await ctx.db.insert("orders", {
          tenantId: args.tenantId,
          orderNumber,
          source: offlineOrder.source,
          status: "open",
          tableId: offlineOrder.tableId,
          tableName: offlineOrder.tableName,
          customerName: offlineOrder.customerName,
          customerPhone: offlineOrder.customerPhone,
          customerEmail: offlineOrder.customerEmail,
          specialInstructions: offlineOrder.specialInstructions,
          items: offlineOrder.items,
          subtotal: offlineOrder.subtotal,
          tax: offlineOrder.tax,
          tip: offlineOrder.tip,
          total: offlineOrder.total,
          paymentStatus: "unpaid",
          orderType: offlineOrder.orderType,
          offlineId: offlineOrder.offlineId,
          serverId: offlineOrder.serverId,
          serverName: offlineOrder.serverName,
          createdAt: offlineOrder.timestamp,
          updatedAt: Date.now(),
        });

        // If dine-in with a table, update table status
        if (offlineOrder.tableId) {
          const table = await ctx.db.get(offlineOrder.tableId);
          if (table && table.tenantId === args.tenantId && table.status === "open") {
            await ctx.db.patch(offlineOrder.tableId, {
              status: "occupied",
              currentOrderId: orderId,
            });
          }
        }

        results.push({
          offlineId: offlineOrder.offlineId,
          success: true,
          orderId,
          orderNumber,
          error: null,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error during sync";
        results.push({
          offlineId: offlineOrder.offlineId,
          success: false,
          orderId: null,
          orderNumber: null,
          error: errorMessage,
        });
      }
    }

    return results;
  },
});
