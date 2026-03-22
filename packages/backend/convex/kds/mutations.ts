import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess, assertTenantOwnership } from "../lib/tenant_auth";

const SOURCE_LABELS: Record<string, string> = {
  dine_in: "Dine-In",
  online: "Online",
  doordash: "DoorDash",
  ubereats: "Uber Eats",
  grubhub: "Grubhub",
};

export const createTicket = mutation({
  args: {
    tenantId: v.id("tenants"),
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot create tickets for another tenant");
    }

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    assertTenantOwnership(order, currentUser.tenantId);

    // Check if ticket already exists
    const existing = await ctx.db
      .query("kdsTickets")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .first();

    if (existing) return existing._id;

    const ticketItems = order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      modifiers: item.modifiers?.map((m) => m.name),
      specialInstructions: item.specialInstructions,
      isBumped: false,
    }));

    return await ctx.db.insert("kdsTickets", {
      tenantId: args.tenantId,
      orderId: args.orderId,
      orderNumber: order.orderNumber,
      source: order.source,
      sourceBadge: SOURCE_LABELS[order.source] ?? order.source,
      status: "new",
      items: ticketItems,
      tableName: order.tableName,
      customerName: order.customerName,
      estimatedPickupTime: order.estimatedPickupTime,
      receivedAt: Date.now(),
    });
  },
});

export const bumpTicket = mutation({
  args: { ticketId: v.id("kdsTickets") },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");
    assertTenantOwnership(ticket, currentUser.tenantId);

    const now = Date.now();

    // Move to bump history (recall queue)
    await ctx.db.insert("kdsBumpHistory", {
      tenantId: ticket.tenantId,
      ticketId: ticket._id,
      orderId: ticket.orderId,
      orderNumber: ticket.orderNumber,
      source: ticket.source,
      bumpedAt: now,
      items: ticket.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        modifiers: i.modifiers,
      })),
    });

    // Update ticket status
    await ctx.db.patch(args.ticketId, {
      status: "bumped",
      bumpedAt: now,
    });

    // Update order status to ready
    await ctx.db.patch(ticket.orderId, {
      status: "ready",
      updatedAt: now,
    });

    return { orderNumber: ticket.orderNumber };
  },
});

export const bumpItem = mutation({
  args: {
    ticketId: v.id("kdsTickets"),
    itemIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");
    assertTenantOwnership(ticket, currentUser.tenantId);

    const updatedItems = [...ticket.items];
    if (args.itemIndex >= 0 && args.itemIndex < updatedItems.length) {
      updatedItems[args.itemIndex] = {
        ...updatedItems[args.itemIndex]!,
        isBumped: true,
      };
    }

    // Check if all items are bumped
    const allBumped = updatedItems.every((i) => i.isBumped);

    await ctx.db.patch(args.ticketId, {
      items: updatedItems,
      status: allBumped ? "bumped" : "in_progress",
      ...(allBumped ? { bumpedAt: Date.now() } : {}),
    });

    // If all bumped, add to history and mark order ready
    if (allBumped) {
      await ctx.db.insert("kdsBumpHistory", {
        tenantId: ticket.tenantId,
        ticketId: ticket._id,
        orderId: ticket.orderId,
        orderNumber: ticket.orderNumber,
        source: ticket.source,
        bumpedAt: Date.now(),
        items: updatedItems.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          modifiers: i.modifiers,
        })),
      });

      await ctx.db.patch(ticket.orderId, {
        status: "ready",
        updatedAt: Date.now(),
      });
    }
  },
});

export const recallTicket = mutation({
  args: { ticketId: v.id("kdsTickets") },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");
    assertTenantOwnership(ticket, currentUser.tenantId);

    // Reset all items
    const resetItems = ticket.items.map((i) => ({
      ...i,
      isBumped: false,
    }));

    await ctx.db.patch(args.ticketId, {
      status: "new",
      items: resetItems,
      recalledAt: Date.now(),
      bumpedAt: undefined,
    });

    // Set order back to preparing
    await ctx.db.patch(ticket.orderId, {
      status: "preparing",
      updatedAt: Date.now(),
    });
  },
});
