import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";

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
 * Convert "HH:MM" to minutes since midnight for arithmetic.
 */
function timeToMinutes(time: string): number {
  const parts = time.split(":").map(Number);
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

/**
 * Get reservations for a specific date, with optional status filter. Staff-only.
 */
export const getReservations = query({
  args: {
    date: v.string(),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("confirmed"),
        v.literal("seated"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("no_show")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_tenantId_date", (q) =>
        q.eq("tenantId", user.tenantId).eq("date", args.date)
      )
      .collect();

    if (args.status) {
      return reservations.filter((r) => r.status === args.status);
    }

    return reservations;
  },
});

/**
 * Get available time slots for a given date and party size.
 * Public query — used by online booking widget.
 *
 * Slot generation logic:
 * 1. Read business hours for the day of week
 * 2. Generate slots at the tenant's configured interval (default 30 min)
 * 3. For each slot, check if at least one table with sufficient capacity is free
 */
export const getAvailableSlots = query({
  args: {
    tenantId: v.id("tenants"),
    date: v.string(),
    partySize: v.number(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant || tenant.status !== "active" || !tenant.reservationsEnabled) {
      return [];
    }

    if (
      tenant.reservationMaxPartySize &&
      args.partySize > tenant.reservationMaxPartySize
    ) {
      return [];
    }

    const slotMinutes = tenant.reservationSlotMinutes ?? 30;
    const defaultDuration = tenant.reservationDefaultDuration ?? 90;

    // Determine operating hours for this date's day of week
    const dateObj = new Date(args.date + "T12:00:00"); // noon to avoid timezone edge
    const dayOfWeek = dateObj.getDay(); // 0=Sunday

    let openTime = "11:00";
    let closeTime = "22:00";

    if (tenant.businessHours) {
      const dayHours = tenant.businessHours.find(
        (bh) => bh.day === dayOfWeek
      );
      if (dayHours) {
        if (dayHours.isClosed) return [];
        openTime = dayHours.open;
        closeTime = dayHours.close;
      }
    }

    // Check holiday hours override
    if (tenant.holidayHours) {
      const holiday = tenant.holidayHours.find((h) => h.date === args.date);
      if (holiday) {
        if (holiday.isClosed) return [];
        if (holiday.open) openTime = holiday.open;
        if (holiday.close) closeTime = holiday.close;
      }
    }

    const openMinutes = timeToMinutes(openTime);
    const closeMinutes = timeToMinutes(closeTime);

    // Get all tables that can seat this party
    const allTables = await ctx.db
      .query("tables")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const suitableTables = allTables.filter(
      (t) => t.seats !== undefined && t.seats >= args.partySize
    );

    if (suitableTables.length === 0) {
      return [];
    }

    // Get existing reservations for the date
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

    // Generate slots
    const availableSlots: string[] = [];
    // Last booking slot should allow the full duration before closing
    const lastSlotMinutes = closeMinutes - defaultDuration;

    for (
      let slotStart = openMinutes;
      slotStart <= lastSlotMinutes;
      slotStart += slotMinutes
    ) {
      const slotHours = Math.floor(slotStart / 60);
      const slotMins = slotStart % 60;
      const slotTime = `${String(slotHours).padStart(2, "0")}:${String(slotMins).padStart(2, "0")}`;
      const slotEnd = computeEndTime(slotTime, defaultDuration);

      // Check if at least one suitable table is free for this slot
      const hasAvailableTable = suitableTables.some((table) => {
        const conflicting = activeReservations.some((r) => {
          if (r.tableId !== table._id) return false;
          const rEnd = r.endTime ?? computeEndTime(r.time, r.duration);
          return slotTime < rEnd && slotEnd > r.time;
        });
        return !conflicting;
      });

      if (hasAvailableTable) {
        availableSlots.push(slotTime);
      }
    }

    return availableSlots;
  },
});

/**
 * Get the current waitlist ordered by position. Staff-only.
 */
export const getWaitlist = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_tenantId_date", (q) =>
        q.eq("tenantId", user.tenantId).eq("date", args.date)
      )
      .collect();

    return reservations
      .filter(
        (r) => r.waitlistPosition !== undefined && r.status === "pending"
      )
      .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0));
  },
});

/**
 * Lookup reservations by phone number.
 * Public query — allows customers to check their own reservations.
 */
export const getReservationsByPhone = query({
  args: {
    tenantId: v.id("tenants"),
    customerPhone: v.string(),
  },
  handler: async (ctx, args) => {
    // Use the tenantId + createdAt index and filter by phone
    // (No phone-specific index to keep index count manageable)
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_tenantId_createdAt", (q) =>
        q.eq("tenantId", args.tenantId)
      )
      .order("desc")
      .collect();

    return reservations
      .filter((r) => r.customerPhone === args.customerPhone)
      .slice(0, 20) // Limit to 20 most recent
      .map((r) => ({
        _id: r._id,
        date: r.date,
        time: r.time,
        partySize: r.partySize,
        status: r.status,
        customerName: r.customerName,
        waitlistPosition: r.waitlistPosition,
      }));
  },
});

/**
 * Get table availability for a specific date/time — shows which tables
 * are available vs reserved. Staff-only.
 */
export const getTableAvailability = query({
  args: {
    date: v.string(),
    time: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const allTables = await ctx.db
      .query("tables")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", user.tenantId))
      .collect();

    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_tenantId_date", (q) =>
        q.eq("tenantId", user.tenantId).eq("date", args.date)
      )
      .collect();

    const activeReservations = reservations.filter(
      (r) =>
        r.status !== "cancelled" &&
        r.status !== "no_show" &&
        r.status !== "completed"
    );

    return allTables.map((table) => {
      const conflictingReservation = activeReservations.find((r) => {
        if (r.tableId !== table._id) return false;
        const rEnd = r.endTime ?? computeEndTime(r.time, r.duration);
        // Check if the queried time falls within this reservation's window
        return args.time >= r.time && args.time < rEnd;
      });

      return {
        _id: table._id,
        name: table.name,
        seats: table.seats,
        section: table.section,
        floor: table.floor,
        status: table.status,
        isAvailableForReservation: !conflictingReservation,
        currentReservation: conflictingReservation
          ? {
              _id: conflictingReservation._id,
              customerName: conflictingReservation.customerName,
              partySize: conflictingReservation.partySize,
              time: conflictingReservation.time,
              endTime: conflictingReservation.endTime,
              status: conflictingReservation.status,
            }
          : undefined,
      };
    });
  },
});
