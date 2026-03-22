import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";

// ==================== Time Clock Mutations ====================

export const clockIn = mutation({
  args: {
    tenantId: v.id("tenants"),
    role: v.string(),
    hourlyRate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot clock in for another tenant");
    }

    // Check if user is already clocked in
    const activeShifts = await ctx.db
      .query("shifts")
      .withIndex("by_tenantId_userId", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", currentUser._id)
      )
      .collect();

    const alreadyClockedIn = activeShifts.find((s) => s.isActive);
    if (alreadyClockedIn) {
      throw new Error("Already clocked in. Clock out before starting a new shift.");
    }

    const now = Date.now();
    const shiftId = await ctx.db.insert("shifts", {
      tenantId: args.tenantId,
      userId: currentUser._id,
      clockIn: now,
      role: args.role,
      hourlyRate: args.hourlyRate,
      notes: args.notes,
      isActive: true,
      createdAt: now,
    });

    return { shiftId, clockIn: now };
  },
});

export const clockOut = mutation({
  args: {
    tenantId: v.id("tenants"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot clock out for another tenant");
    }

    // Find the active shift for this user
    const activeShifts = await ctx.db
      .query("shifts")
      .withIndex("by_tenantId_userId", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", currentUser._id)
      )
      .collect();

    const activeShift = activeShifts.find((s) => s.isActive);
    if (!activeShift) {
      throw new Error("Not currently clocked in");
    }

    const now = Date.now();
    const breakMs = (activeShift.breakMinutes ?? 0) * 60 * 1000;
    const workedMs = now - activeShift.clockIn - breakMs;
    const hoursWorked = Math.max(0, workedMs / (1000 * 60 * 60));

    const updatedNotes =
      args.notes && activeShift.notes
        ? `${activeShift.notes}\n${args.notes}`
        : args.notes ?? activeShift.notes;

    await ctx.db.patch(activeShift._id, {
      clockOut: now,
      isActive: false,
      notes: updatedNotes,
    });

    return {
      shiftId: activeShift._id,
      clockIn: activeShift.clockIn,
      clockOut: now,
      hoursWorked: Math.round(hoursWorked * 100) / 100,
    };
  },
});

export const addBreak = mutation({
  args: {
    tenantId: v.id("tenants"),
    minutes: v.number(),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot add break for another tenant");
    }

    if (args.minutes <= 0) {
      throw new Error("Break minutes must be positive");
    }

    // Find the active shift for this user
    const activeShifts = await ctx.db
      .query("shifts")
      .withIndex("by_tenantId_userId", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", currentUser._id)
      )
      .collect();

    const activeShift = activeShifts.find((s) => s.isActive);
    if (!activeShift) {
      throw new Error("Not currently clocked in");
    }

    const newBreakMinutes = (activeShift.breakMinutes ?? 0) + args.minutes;

    await ctx.db.patch(activeShift._id, {
      breakMinutes: newBreakMinutes,
    });

    return { shiftId: activeShift._id, totalBreakMinutes: newBreakMinutes };
  },
});

export const editShift = mutation({
  args: {
    tenantId: v.id("tenants"),
    shiftId: v.id("shifts"),
    clockIn: v.optional(v.number()),
    clockOut: v.optional(v.number()),
    breakMinutes: v.optional(v.number()),
    role: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot edit shifts for another tenant");
    }

    // Only owner/manager can edit shifts
    if (currentUser.role !== "owner" && currentUser.role !== "manager") {
      throw new Error("Forbidden: only owners and managers can edit shifts");
    }

    const shift = await ctx.db.get(args.shiftId);
    if (!shift) {
      throw new Error("Shift not found");
    }
    if (shift.tenantId !== args.tenantId) {
      throw new Error("Forbidden: shift belongs to another tenant");
    }

    // Validate clockIn/clockOut logic if both are being set
    const newClockIn = args.clockIn ?? shift.clockIn;
    const newClockOut = args.clockOut ?? shift.clockOut;
    if (newClockOut !== undefined && newClockOut <= newClockIn) {
      throw new Error("Clock out time must be after clock in time");
    }

    const patch: Record<string, unknown> = {};
    if (args.clockIn !== undefined) patch.clockIn = args.clockIn;
    if (args.clockOut !== undefined) {
      patch.clockOut = args.clockOut;
      patch.isActive = false;
    }
    if (args.breakMinutes !== undefined) patch.breakMinutes = args.breakMinutes;
    if (args.role !== undefined) patch.role = args.role;
    if (args.hourlyRate !== undefined) patch.hourlyRate = args.hourlyRate;
    if (args.notes !== undefined) patch.notes = args.notes;

    await ctx.db.patch(args.shiftId, patch);

    return { shiftId: args.shiftId };
  },
});

export const deleteShift = mutation({
  args: {
    tenantId: v.id("tenants"),
    shiftId: v.id("shifts"),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot delete shifts for another tenant");
    }

    // Only owner/manager can delete shifts
    if (currentUser.role !== "owner" && currentUser.role !== "manager") {
      throw new Error("Forbidden: only owners and managers can delete shifts");
    }

    const shift = await ctx.db.get(args.shiftId);
    if (!shift) {
      throw new Error("Shift not found");
    }
    if (shift.tenantId !== args.tenantId) {
      throw new Error("Forbidden: shift belongs to another tenant");
    }

    await ctx.db.delete(args.shiftId);

    return { deleted: true };
  },
});

// ==================== Schedule Mutations ====================

export const createScheduleEntry = mutation({
  args: {
    tenantId: v.id("tenants"),
    userId: v.id("users"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    role: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot create schedules for another tenant");
    }

    // Only owner/manager can create schedule entries
    if (currentUser.role !== "owner" && currentUser.role !== "manager") {
      throw new Error("Forbidden: only owners and managers can create schedules");
    }

    // Validate the target user belongs to this tenant
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }
    if (targetUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: user belongs to another tenant");
    }

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      throw new Error("Invalid date format. Expected YYYY-MM-DD");
    }

    // Validate time format HH:MM
    if (!/^\d{2}:\d{2}$/.test(args.startTime) || !/^\d{2}:\d{2}$/.test(args.endTime)) {
      throw new Error("Invalid time format. Expected HH:MM");
    }

    const scheduleId = await ctx.db.insert("schedules", {
      tenantId: args.tenantId,
      userId: args.userId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      role: args.role,
      notes: args.notes,
      createdAt: Date.now(),
    });

    return { scheduleId };
  },
});

export const updateScheduleEntry = mutation({
  args: {
    tenantId: v.id("tenants"),
    scheduleId: v.id("schedules"),
    userId: v.optional(v.id("users")),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    role: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot update schedules for another tenant");
    }

    if (currentUser.role !== "owner" && currentUser.role !== "manager") {
      throw new Error("Forbidden: only owners and managers can update schedules");
    }

    const schedule = await ctx.db.get(args.scheduleId);
    if (!schedule) {
      throw new Error("Schedule entry not found");
    }
    if (schedule.tenantId !== args.tenantId) {
      throw new Error("Forbidden: schedule belongs to another tenant");
    }

    // Validate new user if being changed
    if (args.userId) {
      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser) {
        throw new Error("User not found");
      }
      if (targetUser.tenantId !== args.tenantId) {
        throw new Error("Forbidden: user belongs to another tenant");
      }
    }

    // Validate date format if provided
    if (args.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      throw new Error("Invalid date format. Expected YYYY-MM-DD");
    }

    // Validate time formats if provided
    if (args.startTime !== undefined && !/^\d{2}:\d{2}$/.test(args.startTime)) {
      throw new Error("Invalid start time format. Expected HH:MM");
    }
    if (args.endTime !== undefined && !/^\d{2}:\d{2}$/.test(args.endTime)) {
      throw new Error("Invalid end time format. Expected HH:MM");
    }

    const patch: Record<string, unknown> = {};
    if (args.userId !== undefined) patch.userId = args.userId;
    if (args.date !== undefined) patch.date = args.date;
    if (args.startTime !== undefined) patch.startTime = args.startTime;
    if (args.endTime !== undefined) patch.endTime = args.endTime;
    if (args.role !== undefined) patch.role = args.role;
    if (args.notes !== undefined) patch.notes = args.notes;

    await ctx.db.patch(args.scheduleId, patch);

    return { scheduleId: args.scheduleId };
  },
});

export const deleteScheduleEntry = mutation({
  args: {
    tenantId: v.id("tenants"),
    scheduleId: v.id("schedules"),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot delete schedules for another tenant");
    }

    if (currentUser.role !== "owner" && currentUser.role !== "manager") {
      throw new Error("Forbidden: only owners and managers can delete schedules");
    }

    const schedule = await ctx.db.get(args.scheduleId);
    if (!schedule) {
      throw new Error("Schedule entry not found");
    }
    if (schedule.tenantId !== args.tenantId) {
      throw new Error("Forbidden: schedule belongs to another tenant");
    }

    await ctx.db.delete(args.scheduleId);

    return { deleted: true };
  },
});

export const bulkCreateSchedule = mutation({
  args: {
    tenantId: v.id("tenants"),
    entries: v.array(
      v.object({
        userId: v.id("users"),
        date: v.string(),
        startTime: v.string(),
        endTime: v.string(),
        role: v.string(),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot create schedules for another tenant");
    }

    if (currentUser.role !== "owner" && currentUser.role !== "manager") {
      throw new Error("Forbidden: only owners and managers can create schedules");
    }

    if (args.entries.length === 0) {
      throw new Error("At least one schedule entry is required");
    }

    if (args.entries.length > 200) {
      throw new Error("Cannot create more than 200 schedule entries at once");
    }

    // Validate all entries before inserting any
    const validatedUserIds = new Set<string>();
    for (const entry of args.entries) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
        throw new Error(`Invalid date format: ${entry.date}. Expected YYYY-MM-DD`);
      }
      // Validate time format
      if (!/^\d{2}:\d{2}$/.test(entry.startTime)) {
        throw new Error(`Invalid start time format: ${entry.startTime}. Expected HH:MM`);
      }
      if (!/^\d{2}:\d{2}$/.test(entry.endTime)) {
        throw new Error(`Invalid end time format: ${entry.endTime}. Expected HH:MM`);
      }

      // Validate user belongs to tenant (deduplicate lookups)
      const userIdStr = entry.userId as string;
      if (!validatedUserIds.has(userIdStr)) {
        const targetUser = await ctx.db.get(entry.userId);
        if (!targetUser) {
          throw new Error(`User not found: ${entry.userId}`);
        }
        if (targetUser.tenantId !== args.tenantId) {
          throw new Error(`User ${entry.userId} belongs to another tenant`);
        }
        validatedUserIds.add(userIdStr);
      }
    }

    // Insert all entries
    const now = Date.now();
    const scheduleIds: string[] = [];
    for (const entry of args.entries) {
      const id = await ctx.db.insert("schedules", {
        tenantId: args.tenantId,
        userId: entry.userId,
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        role: entry.role,
        notes: entry.notes,
        createdAt: now,
      });
      scheduleIds.push(id as string);
    }

    return { scheduleIds, count: scheduleIds.length };
  },
});
