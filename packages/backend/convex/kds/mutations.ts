import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
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

    const ticketItems = await Promise.all(
      order.items.map(async (item) => {
        const menuItem = await ctx.db.get(item.menuItemId);
        return {
          name: item.name,
          quantity: item.quantity,
          modifiers: item.modifiers?.map((m) => m.name),
          specialInstructions: item.specialInstructions,
          station: menuItem?.station,
          course: item.course ?? 1,
          isBumped: false,
        };
      })
    );

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

export const fireNextCourse = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    assertTenantOwnership(order, currentUser.tenantId);

    const firedCourses = order.firedCourses ?? [1];

    // Collect all distinct course numbers from order items
    const allCourses = [
      ...new Set(order.items.map((i: { course?: number }) => i.course ?? 1)),
    ].sort((a, b) => a - b);

    // Find the next unfired course
    const nextCourse = allCourses.find((c) => !firedCourses.includes(c));
    if (nextCourse === undefined) {
      throw new Error("All courses have been fired");
    }

    // Get items for the next course
    const courseItems = order.items.filter(
      (i: { course?: number }) => (i.course ?? 1) === nextCourse
    );

    // Look up menuItem for each to get station, build ticket items
    const ticketItems = await Promise.all(
      courseItems.map(async (item: { menuItemId: Id<"menuItems">; name: string; quantity: number; modifiers?: Array<{ name: string }>; specialInstructions?: string; course?: number }) => {
        const menuItem = await ctx.db.get(item.menuItemId);
        return {
          name: item.name,
          quantity: item.quantity,
          modifiers: item.modifiers?.map((m) => m.name),
          specialInstructions: item.specialInstructions,
          station: menuItem?.station as string | undefined,
          course: nextCourse,
          isBumped: false,
        };
      })
    );

    const SOURCE_LABELS: Record<string, string> = {
      dine_in: "Dine-In",
      online: "Online",
      doordash: "DoorDash",
      ubereats: "Uber Eats",
      grubhub: "Grubhub",
    };

    // Create KDS ticket for this course
    await ctx.db.insert("kdsTickets", {
      tenantId: order.tenantId,
      orderId: args.orderId,
      orderNumber: order.orderNumber,
      source: order.source,
      sourceBadge: SOURCE_LABELS[order.source] ?? order.source,
      status: "new",
      items: ticketItems,
      courseNumber: nextCourse,
      tableName: order.tableName,
      customerName: order.customerName,
      estimatedPickupTime: order.estimatedPickupTime,
      receivedAt: Date.now(),
    });

    // Update order's firedCourses
    const updatedFiredCourses = [...firedCourses, nextCourse];
    await ctx.db.patch(args.orderId, {
      firedCourses: updatedFiredCourses,
      updatedAt: Date.now(),
    });

    const remainingCourses = allCourses.filter(
      (c) => !updatedFiredCourses.includes(c)
    );

    return { firedCourse: nextCourse, remainingCourses };
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
