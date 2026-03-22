import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";
import { Doc, Id } from "../_generated/dataModel";

// ── Helper: fetch shifts in a date range for a tenant ──
async function fetchShiftsInRange(
  ctx: { db: any },
  tenantId: string,
  startDate: number,
  endDate: number
): Promise<Doc<"shifts">[]> {
  const shifts = await ctx.db
    .query("shifts")
    .withIndex("by_tenantId_createdAt", (q: any) =>
      q.eq("tenantId", tenantId).gte("createdAt", startDate)
    )
    .collect();

  return shifts.filter((s: Doc<"shifts">) => s.createdAt <= endDate);
}

// ── Helper: calculate hours from a shift ──
function calcShiftHours(shift: Doc<"shifts">): number {
  if (!shift.clockOut) return 0;
  const breakMs = (shift.breakMinutes ?? 0) * 60 * 1000;
  const workedMs = shift.clockOut - shift.clockIn - breakMs;
  return Math.max(0, workedMs / (1000 * 60 * 60));
}

// ── Helper: get the ISO week start (Monday) for a given timestamp ──
function getWeekStart(timestamp: number): string {
  const d = new Date(timestamp);
  const day = d.getUTCDay();
  // Shift to Monday as week start: Sunday=0 becomes -6, Monday=1 becomes 0, etc.
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0]!;
}

// ============================================================
// 1. getActiveShifts — all currently clocked-in staff
// ============================================================
export const getActiveShifts = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const allShifts = await ctx.db
      .query("shifts")
      .withIndex("by_tenantId", (q: any) => q.eq("tenantId", args.tenantId))
      .collect();

    const activeShifts = allShifts.filter((s: Doc<"shifts">) => s.isActive);

    // Enrich with user names
    const enriched = [];
    for (const shift of activeShifts) {
      const shiftUser = await ctx.db.get(shift.userId);
      enriched.push({
        ...shift,
        userName: shiftUser?.name ?? shiftUser?.email ?? "Unknown",
        currentDurationMinutes: Math.round((Date.now() - shift.clockIn) / (1000 * 60)),
      });
    }

    return enriched;
  },
});

// ============================================================
// 2. getShiftHistory — shifts for date range, optional userId filter
// ============================================================
export const getShiftHistory = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    let shifts: Doc<"shifts">[];

    if (args.userId) {
      // Use the more specific index when filtering by user
      const allUserShifts = await ctx.db
        .query("shifts")
        .withIndex("by_tenantId_userId", (q: any) =>
          q.eq("tenantId", args.tenantId).eq("userId", args.userId)
        )
        .collect();

      shifts = allUserShifts.filter(
        (s: Doc<"shifts">) => s.createdAt >= args.startDate && s.createdAt <= args.endDate
      );
    } else {
      shifts = await fetchShiftsInRange(ctx, args.tenantId, args.startDate, args.endDate);
    }

    // Enrich with user names and calculated hours
    const enriched = [];
    for (const shift of shifts) {
      const shiftUser = await ctx.db.get(shift.userId);
      enriched.push({
        ...shift,
        userName: shiftUser?.name ?? shiftUser?.email ?? "Unknown",
        hoursWorked: Math.round(calcShiftHours(shift) * 100) / 100,
      });
    }

    return enriched.sort((a, b) => b.clockIn - a.clockIn);
  },
});

// ============================================================
// 3. getWeekSchedule — schedule entries for a date range
// ============================================================
export const getWeekSchedule = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    // Fetch all schedules where date >= startDate
    const schedules = await ctx.db
      .query("schedules")
      .withIndex("by_tenantId_date", (q: any) =>
        q.eq("tenantId", args.tenantId).gte("date", args.startDate)
      )
      .collect();

    // Filter to endDate
    const filtered = schedules.filter(
      (s: Doc<"schedules">) => s.date <= args.endDate
    );

    // Enrich with user names
    const enriched = [];
    for (const schedule of filtered) {
      const scheduleUser = await ctx.db.get(schedule.userId);
      enriched.push({
        ...schedule,
        userName: scheduleUser?.name ?? scheduleUser?.email ?? "Unknown",
      });
    }

    return enriched.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
  },
});

// ============================================================
// 4. getUserSchedule — schedule for a specific user
// ============================================================
export const getUserSchedule = query({
  args: {
    tenantId: v.id("tenants"),
    userId: v.id("users"),
    startDate: v.optional(v.string()), // "YYYY-MM-DD"
    endDate: v.optional(v.string()), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const schedules = await ctx.db
      .query("schedules")
      .withIndex("by_tenantId_userId", (q: any) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.userId)
      )
      .collect();

    let filtered = schedules;
    if (args.startDate) {
      filtered = filtered.filter((s: Doc<"schedules">) => s.date >= args.startDate!);
    }
    if (args.endDate) {
      filtered = filtered.filter((s: Doc<"schedules">) => s.date <= args.endDate!);
    }

    return filtered.sort((a: Doc<"schedules">, b: Doc<"schedules">) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
  },
});

// ============================================================
// 5. getLaborReport — labor cost summary for date range
// ============================================================
export const getLaborReport = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const shifts = await fetchShiftsInRange(ctx, args.tenantId, args.startDate, args.endDate);

    // Only completed shifts (with clockOut) count for labor
    const completedShifts = shifts.filter((s) => s.clockOut !== undefined);

    // Group hours by employee and by week (for overtime calculation)
    // weekKey -> userId -> hours
    const weeklyHours: Record<string, Record<string, number>> = {};
    // userId -> { shifts, totalHours, rate, userId }
    const employeeData: Record<
      string,
      {
        userId: Id<"users">;
        shifts: Doc<"shifts">[];
        totalHours: number;
        hourlyRate: number;
      }
    > = {};

    for (const shift of completedShifts) {
      const hours = calcShiftHours(shift);
      const userIdStr = shift.userId as string;
      const weekKey = getWeekStart(shift.clockIn);

      // Track weekly hours for overtime
      if (!weeklyHours[weekKey]) {
        weeklyHours[weekKey] = {};
      }
      weeklyHours[weekKey]![userIdStr] = (weeklyHours[weekKey]![userIdStr] ?? 0) + hours;

      // Track employee aggregate data
      if (!employeeData[userIdStr]) {
        employeeData[userIdStr] = {
          userId: shift.userId,
          shifts: [],
          totalHours: 0,
          hourlyRate: shift.hourlyRate ?? 0,
        };
      }
      employeeData[userIdStr]!.shifts.push(shift);
      employeeData[userIdStr]!.totalHours += hours;
      // Use the most recent hourly rate
      if (shift.hourlyRate !== undefined) {
        employeeData[userIdStr]!.hourlyRate = shift.hourlyRate;
      }
    }

    // Calculate overtime per employee
    // Overtime = hours over 40 in any given week, at 1.5x rate
    const employeeOvertime: Record<string, number> = {};
    for (const [_weekKey, userHours] of Object.entries(weeklyHours)) {
      for (const [userId, hours] of Object.entries(userHours)) {
        if (hours > 40) {
          employeeOvertime[userId] = (employeeOvertime[userId] ?? 0) + (hours - 40);
        }
      }
    }

    // Build per-employee report
    let totalHours = 0;
    let totalLaborCost = 0;

    const employees = [];
    for (const [userIdStr, data] of Object.entries(employeeData)) {
      const shiftUser = await ctx.db.get(data.userId);
      const name = shiftUser?.name ?? shiftUser?.email ?? "Unknown";

      const overtimeHours = employeeOvertime[userIdStr] ?? 0;
      const regularHours = data.totalHours - overtimeHours;

      // hourlyRate is in cents
      const regularPay = Math.round(regularHours * data.hourlyRate);
      const overtimePay = Math.round(overtimeHours * data.hourlyRate * 1.5);
      const totalPay = regularPay + overtimePay;

      totalHours += data.totalHours;
      totalLaborCost += totalPay;

      employees.push({
        userId: userIdStr,
        name,
        hours: Math.round(data.totalHours * 100) / 100,
        regularHours: Math.round(regularHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        hourlyRate: data.hourlyRate,
        regularPay,
        overtimePay,
        totalPay,
      });
    }

    // Get revenue for the same period to calculate labor cost as % of revenue
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_tenantId_createdAt", (q: any) =>
        q.eq("tenantId", args.tenantId).gte("createdAt", args.startDate)
      )
      .collect();

    const revenueOrders = orders.filter(
      (o: Doc<"orders">) =>
        o.createdAt <= args.endDate &&
        o.status !== "cancelled" &&
        o.paymentStatus !== "refunded"
    );
    const totalRevenue = revenueOrders.reduce((sum: number, o: Doc<"orders">) => sum + o.total, 0);

    const laborCostPercentage =
      totalRevenue > 0
        ? Math.round((totalLaborCost / totalRevenue) * 10000) / 100
        : 0;

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalLaborCost,
      totalRevenue,
      laborCostPercentage,
      employees: employees.sort((a, b) => b.totalPay - a.totalPay),
    };
  },
});

// ============================================================
// 6. getTimesheetExport — raw shift data for payroll export
// ============================================================
export const getTimesheetExport = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const shifts = await fetchShiftsInRange(ctx, args.tenantId, args.startDate, args.endDate);
    const completedShifts = shifts.filter((s) => s.clockOut !== undefined);

    const rows = [];
    for (const shift of completedShifts) {
      const shiftUser = await ctx.db.get(shift.userId);
      rows.push({
        shiftId: shift._id,
        userId: shift.userId,
        employeeName: shiftUser?.name ?? shiftUser?.email ?? "Unknown",
        employeeEmail: shiftUser?.email ?? "",
        role: shift.role,
        clockIn: shift.clockIn,
        clockOut: shift.clockOut!,
        breakMinutes: shift.breakMinutes ?? 0,
        hoursWorked: Math.round(calcShiftHours(shift) * 100) / 100,
        hourlyRate: shift.hourlyRate ?? 0,
        date: new Date(shift.clockIn).toISOString().split("T")[0]!,
        notes: shift.notes ?? "",
      });
    }

    return rows.sort((a, b) => a.clockIn - b.clockIn);
  },
});
