import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { requireTenantAccess, assertTenantOwnership } from "../lib/tenant_auth";

/**
 * Compute the end time string given a start time "HH:MM" and duration in minutes.
 */
function computeEndTime(startTime: string, durationMinutes: number): string {
  const parts = startTime.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

/**
 * Create a new reservation.
 * Public (for online bookings) — no auth required.
 * When autoConfirm is enabled and a suitable table is available, the reservation
 * is automatically confirmed and assigned a table.
 */
export const createReservation = mutation({
  args: {
    tenantId: v.id("tenants"),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    partySize: v.number(),
    date: v.string(),
    time: v.string(),
    duration: v.optional(v.number()),
    source: v.union(
      v.literal("online"),
      v.literal("phone"),
      v.literal("walk_in")
    ),
    notes: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify tenant exists and is active
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant || tenant.status !== "active") {
      throw new Error("Restaurant is not currently accepting reservations");
    }

    if (!tenant.reservationsEnabled) {
      throw new Error("Reservations are not enabled for this restaurant");
    }

    // Validate party size
    if (args.partySize < 1) {
      throw new Error("Party size must be at least 1");
    }
    if (
      tenant.reservationMaxPartySize &&
      args.partySize > tenant.reservationMaxPartySize
    ) {
      throw new Error(
        `Party size exceeds maximum of ${tenant.reservationMaxPartySize}. Please call the restaurant directly.`
      );
    }

    // Validate date is not too far in advance
    if (tenant.reservationMaxDaysAhead) {
      const reservationDate = new Date(args.date + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil(
        (reservationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > tenant.reservationMaxDaysAhead) {
        throw new Error(
          `Reservations can only be made up to ${tenant.reservationMaxDaysAhead} days in advance`
        );
      }
      if (diffDays < 0) {
        throw new Error("Cannot create a reservation in the past");
      }
    }

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(args.time)) {
      throw new Error("Time must be in HH:MM format");
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      throw new Error("Date must be in YYYY-MM-DD format");
    }

    const duration =
      args.duration ?? tenant.reservationDefaultDuration ?? 90;
    const endTime = computeEndTime(args.time, duration);

    let status: "pending" | "confirmed" = "pending";
    let assignedTableId: Id<"tables"> | undefined;

    // Auto-confirm + auto-assign table if enabled
    if (tenant.reservationAutoConfirm && args.source === "online") {
      // Find tables that can seat this party
      const allTables = await ctx.db
        .query("tables")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
        .collect();

      const suitableTables = allTables.filter(
        (t) => t.seats !== undefined && t.seats >= args.partySize
      );

      // Check which tables are already reserved for this date/time window
      const existingReservations = await ctx.db
        .query("reservations")
        .withIndex("by_tenantId_date", (q) =>
          q.eq("tenantId", args.tenantId).eq("date", args.date)
        )
        .collect();

      const activeReservations = existingReservations.filter(
        (r) =>
          r.status !== "cancelled" &&
          r.status !== "no_show" &&
          r.status !== "completed"
      );

      // Find first table with no time overlap
      for (const table of suitableTables) {
        const conflicting = activeReservations.some((r) => {
          if (r.tableId !== table._id) return false;
          const rEnd = r.endTime ?? computeEndTime(r.time, r.duration);
          // Overlap: new start < existing end AND new end > existing start
          return args.time < rEnd && endTime > r.time;
        });
        if (!conflicting) {
          assignedTableId = table._id;
          status = "confirmed";
          break;
        }
      }

      // If no table found but auto-confirm is on, still confirm without table
      if (!assignedTableId) {
        status = "confirmed";
      }
    }

    const reservationId = await ctx.db.insert("reservations", {
      tenantId: args.tenantId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      partySize: args.partySize,
      date: args.date,
      time: args.time,
      endTime,
      duration,
      tableId: assignedTableId,
      status,
      source: args.source,
      notes: args.notes,
      specialRequests: args.specialRequests,
      createdAt: Date.now(),
    });

    return { reservationId, status, tableId: assignedTableId };
  },
});

/**
 * Update reservation details. Staff-only.
 */
export const updateReservation = mutation({
  args: {
    reservationId: v.id("reservations"),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    partySize: v.optional(v.number()),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    duration: v.optional(v.number()),
    tableId: v.optional(v.id("tables")),
    notes: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const reservation = await ctx.db.get(args.reservationId);
    assertTenantOwnership(reservation, user.tenantId);

    if (
      reservation.status === "completed" ||
      reservation.status === "cancelled"
    ) {
      throw new Error(
        `Cannot update a ${reservation.status} reservation`
      );
    }

    const { reservationId, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    // Recompute endTime if time or duration changed
    const newTime = (cleanUpdates.time as string) ?? reservation.time;
    const newDuration =
      (cleanUpdates.duration as number) ?? reservation.duration;
    if (cleanUpdates.time !== undefined || cleanUpdates.duration !== undefined) {
      cleanUpdates.endTime = computeEndTime(newTime, newDuration);
    }

    if (args.partySize !== undefined && args.partySize < 1) {
      throw new Error("Party size must be at least 1");
    }

    await ctx.db.patch(reservationId, cleanUpdates);
  },
});

/**
 * Cancel a reservation.
 * Public — customers can cancel by providing their phone number.
 * Staff can cancel any reservation for their tenant.
 */
export const cancelReservation = mutation({
  args: {
    reservationId: v.id("reservations"),
    customerPhone: v.optional(v.string()), // for public cancellation verification
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Try staff auth first
    let isStaff = false;
    try {
      const user = await requireTenantAccess(ctx);
      assertTenantOwnership(reservation, user.tenantId);
      isStaff = true;
    } catch {
      // Not staff — require phone verification
    }

    if (!isStaff) {
      if (!args.customerPhone) {
        throw new Error("Phone number is required to cancel a reservation");
      }
      if (reservation.customerPhone !== args.customerPhone) {
        throw new Error("Phone number does not match this reservation");
      }
    }

    if (reservation.status === "completed" || reservation.status === "cancelled") {
      throw new Error(`Reservation is already ${reservation.status}`);
    }

    await ctx.db.patch(args.reservationId, { status: "cancelled" });

    // Free the table if one was assigned and the table is currently reserved
    if (reservation.tableId) {
      const table = await ctx.db.get(reservation.tableId);
      if (table && table.status === "reserved") {
        await ctx.db.patch(reservation.tableId, { status: "open" });
      }
    }
  },
});

/**
 * Confirm a reservation and optionally assign a table. Staff-only.
 */
export const confirmReservation = mutation({
  args: {
    reservationId: v.id("reservations"),
    tableId: v.optional(v.id("tables")),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const reservation = await ctx.db.get(args.reservationId);
    assertTenantOwnership(reservation, user.tenantId);

    if (reservation.status !== "pending") {
      throw new Error(
        `Cannot confirm a reservation with status "${reservation.status}"`
      );
    }

    const updates: Record<string, unknown> = { status: "confirmed" };

    if (args.tableId) {
      const table = await ctx.db.get(args.tableId);
      assertTenantOwnership(table, user.tenantId);
      updates.tableId = args.tableId;
    }

    await ctx.db.patch(args.reservationId, updates);
  },
});

/**
 * Seat a reservation — marks the party as seated. Staff-only.
 */
export const seatReservation = mutation({
  args: {
    reservationId: v.id("reservations"),
    tableId: v.optional(v.id("tables")), // allow override at seating time
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const reservation = await ctx.db.get(args.reservationId);
    assertTenantOwnership(reservation, user.tenantId);

    if (
      reservation.status !== "confirmed" &&
      reservation.status !== "pending"
    ) {
      throw new Error(
        `Cannot seat a reservation with status "${reservation.status}"`
      );
    }

    const finalTableId = args.tableId ?? reservation.tableId;

    const updates: Record<string, unknown> = { status: "seated" };
    if (args.tableId) {
      updates.tableId = args.tableId;
    }

    await ctx.db.patch(args.reservationId, updates);

    // Mark the table as occupied
    if (finalTableId) {
      const table = await ctx.db.get(finalTableId);
      if (table) {
        assertTenantOwnership(table, user.tenantId);
        await ctx.db.patch(finalTableId, { status: "occupied" });
      }
    }
  },
});

/**
 * Complete a reservation — party has left, free the table. Staff-only.
 */
export const completeReservation = mutation({
  args: {
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const reservation = await ctx.db.get(args.reservationId);
    assertTenantOwnership(reservation, user.tenantId);

    if (reservation.status !== "seated") {
      throw new Error(
        `Cannot complete a reservation with status "${reservation.status}"`
      );
    }

    await ctx.db.patch(args.reservationId, { status: "completed" });

    // Free the table
    if (reservation.tableId) {
      const table = await ctx.db.get(reservation.tableId);
      if (table && table.status === "occupied") {
        assertTenantOwnership(table, user.tenantId);
        await ctx.db.patch(reservation.tableId, {
          status: "open",
          currentOrderId: undefined,
        });
      }
    }
  },
});

/**
 * Mark a reservation as no-show. Staff-only.
 */
export const markNoShow = mutation({
  args: {
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const reservation = await ctx.db.get(args.reservationId);
    assertTenantOwnership(reservation, user.tenantId);

    if (
      reservation.status === "completed" ||
      reservation.status === "cancelled" ||
      reservation.status === "seated"
    ) {
      throw new Error(
        `Cannot mark a ${reservation.status} reservation as no-show`
      );
    }

    await ctx.db.patch(args.reservationId, { status: "no_show" });

    // Free the table if one was assigned
    if (reservation.tableId) {
      const table = await ctx.db.get(reservation.tableId);
      if (table && table.status === "reserved") {
        assertTenantOwnership(table, user.tenantId);
        await ctx.db.patch(reservation.tableId, { status: "open" });
      }
    }
  },
});

/**
 * Add a customer to the waitlist.
 * Public (for online) or staff (walk-in/phone).
 */
export const addToWaitlist = mutation({
  args: {
    tenantId: v.id("tenants"),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    partySize: v.number(),
    date: v.string(),
    notes: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
    source: v.union(
      v.literal("online"),
      v.literal("phone"),
      v.literal("walk_in")
    ),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant || tenant.status !== "active") {
      throw new Error("Restaurant is not currently accepting waitlist entries");
    }

    if (args.partySize < 1) {
      throw new Error("Party size must be at least 1");
    }

    // Determine next waitlist position for this date
    const existingReservations = await ctx.db
      .query("reservations")
      .withIndex("by_tenantId_date", (q) =>
        q.eq("tenantId", args.tenantId).eq("date", args.date)
      )
      .collect();

    const waitlistEntries = existingReservations.filter(
      (r) => r.waitlistPosition !== undefined && r.status === "pending"
    );

    let maxPosition = 0;
    for (const entry of waitlistEntries) {
      if (
        entry.waitlistPosition !== undefined &&
        entry.waitlistPosition > maxPosition
      ) {
        maxPosition = entry.waitlistPosition;
      }
    }
    const nextPosition = maxPosition + 1;

    const duration = tenant.reservationDefaultDuration ?? 90;

    const reservationId = await ctx.db.insert("reservations", {
      tenantId: args.tenantId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      partySize: args.partySize,
      date: args.date,
      time: "00:00", // waitlist entries don't have a specific time
      duration,
      status: "pending",
      source: args.source,
      notes: args.notes,
      specialRequests: args.specialRequests,
      waitlistPosition: nextPosition,
      createdAt: Date.now(),
    });

    return { reservationId, waitlistPosition: nextPosition };
  },
});
