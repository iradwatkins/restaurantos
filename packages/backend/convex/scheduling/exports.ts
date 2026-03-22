import { query, QueryCtx } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";
import { Doc } from "../_generated/dataModel";

// ── Helper: fetch completed shifts in a date range ──
async function fetchCompletedShiftsInRange(
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

  return shifts.filter(
    (s: Doc<"shifts">) => s.createdAt <= endDate && s.clockOut !== undefined
  );
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
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0]!;
}

// ── Helper: compute per-employee overtime given weekly grouping ──
function computeOvertimeByEmployee(
  shifts: Doc<"shifts">[]
): Record<string, number> {
  const weeklyHours: Record<string, Record<string, number>> = {};

  for (const shift of shifts) {
    const hours = calcShiftHours(shift);
    const userIdStr = shift.userId as string;
    const weekKey = getWeekStart(shift.clockIn);

    if (!weeklyHours[weekKey]) {
      weeklyHours[weekKey] = {};
    }
    weeklyHours[weekKey]![userIdStr] = (weeklyHours[weekKey]![userIdStr] ?? 0) + hours;
  }

  const overtime: Record<string, number> = {};
  for (const [_weekKey, userHours] of Object.entries(weeklyHours)) {
    for (const [userId, hours] of Object.entries(userHours)) {
      if (hours > 40) {
        overtime[userId] = (overtime[userId] ?? 0) + (hours - 40);
      }
    }
  }
  return overtime;
}

// ── Helper: build userId->name map from shifts ──
async function buildUserNameMap(
  ctx: QueryCtx,
  shifts: Doc<"shifts">[]
): Promise<Record<string, string>> {
  const nameMap: Record<string, string> = {};
  const seen = new Set<string>();

  for (const shift of shifts) {
    const userIdStr = shift.userId as string;
    if (seen.has(userIdStr)) continue;
    seen.add(userIdStr);

    const shiftUser = await ctx.db.get(shift.userId);
    nameMap[userIdStr] = shiftUser?.name ?? shiftUser?.email ?? "Unknown";
  }

  return nameMap;
}

// ============================================================
// 1. exportPayrollCSV — structured data for CSV payroll export
// ============================================================
export const exportPayrollCSV = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const shifts = await fetchCompletedShiftsInRange(
      ctx,
      args.tenantId,
      args.startDate,
      args.endDate
    );

    const overtimeByEmployee = computeOvertimeByEmployee(shifts);
    const userNameMap = await buildUserNameMap(ctx, shifts);

    // Group shifts by employee
    const employeeShifts: Record<string, Doc<"shifts">[]> = {};
    for (const shift of shifts) {
      const userIdStr = shift.userId as string;
      if (!employeeShifts[userIdStr]) {
        employeeShifts[userIdStr] = [];
      }
      employeeShifts[userIdStr]!.push(shift);
    }

    const rows = [];
    for (const [userIdStr, userShifts] of Object.entries(employeeShifts)) {
      const employeeName = userNameMap[userIdStr] ?? "Unknown";

      const totalHours = userShifts.reduce((sum, s) => sum + calcShiftHours(s), 0);
      const overtimeHours = overtimeByEmployee[userIdStr] ?? 0;
      const regularHours = totalHours - overtimeHours;
      const hourlyRate = userShifts[userShifts.length - 1]?.hourlyRate ?? 0;

      const regularPay = Math.round(regularHours * hourlyRate);
      const overtimePay = Math.round(overtimeHours * hourlyRate * 1.5);
      const grossPay = regularPay + overtimePay;

      // Individual shift rows for detailed CSV
      for (const shift of userShifts) {
        const shiftHours = calcShiftHours(shift);
        const shiftDate = new Date(shift.clockIn).toISOString().split("T")[0]!;

        rows.push({
          employeeName,
          employeeId: userIdStr,
          date: shiftDate,
          hoursWorked: Math.round(shiftHours * 100) / 100,
          hourlyRate: shift.hourlyRate ?? 0,
          role: shift.role,
        });
      }

      // Summary row per employee
      rows.push({
        employeeName,
        employeeId: userIdStr,
        date: "SUMMARY",
        hoursWorked: Math.round(totalHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        regularHours: Math.round(regularHours * 100) / 100,
        hourlyRate,
        regularPay,
        overtimePay,
        grossPay,
        role: "",
      });
    }

    return {
      payPeriodStart: args.startDate,
      payPeriodEnd: args.endDate,
      rows,
    };
  },
});

// ============================================================
// 2. exportADPFormat — data formatted for ADP payroll import
// ============================================================
export const exportADPFormat = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
    coCode: v.string(),
    batchId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const shifts = await fetchCompletedShiftsInRange(
      ctx,
      args.tenantId,
      args.startDate,
      args.endDate
    );

    const overtimeByEmployee = computeOvertimeByEmployee(shifts);

    // Group by employee
    const employeeShifts: Record<string, Doc<"shifts">[]> = {};
    for (const shift of shifts) {
      const userIdStr = shift.userId as string;
      if (!employeeShifts[userIdStr]) {
        employeeShifts[userIdStr] = [];
      }
      employeeShifts[userIdStr]!.push(shift);
    }

    const rows = [];
    for (const [userIdStr, userShifts] of Object.entries(employeeShifts)) {
      const totalHours = userShifts.reduce((sum, s) => sum + calcShiftHours(s), 0);
      const overtimeHours = overtimeByEmployee[userIdStr] ?? 0;
      const regularHours = totalHours - overtimeHours;
      const hourlyRate = userShifts[userShifts.length - 1]?.hourlyRate ?? 0;

      // ADP rate is in dollars, convert from cents
      const rateInDollars = Math.round(hourlyRate) / 100;

      rows.push({
        coCode: args.coCode,
        batchId: args.batchId,
        employeeId: userIdStr,
        regHours: Math.round(regularHours * 100) / 100,
        otHours: Math.round(overtimeHours * 100) / 100,
        rate: rateInDollars,
      });
    }

    return {
      payPeriodStart: args.startDate,
      payPeriodEnd: args.endDate,
      rows,
    };
  },
});

// ============================================================
// 3. exportGustoFormat — data formatted for Gusto API
// ============================================================
export const exportGustoFormat = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const shifts = await fetchCompletedShiftsInRange(
      ctx,
      args.tenantId,
      args.startDate,
      args.endDate
    );

    // Group by employee
    const employeeShifts: Record<string, Doc<"shifts">[]> = {};
    for (const shift of shifts) {
      const userIdStr = shift.userId as string;
      if (!employeeShifts[userIdStr]) {
        employeeShifts[userIdStr] = [];
      }
      employeeShifts[userIdStr]!.push(shift);
    }

    const payPeriodStart = new Date(args.startDate).toISOString().split("T")[0]!;
    const payPeriodEnd = new Date(args.endDate).toISOString().split("T")[0]!;

    const rows = [];
    for (const [userIdStr, userShifts] of Object.entries(employeeShifts)) {
      const totalHours = userShifts.reduce((sum, s) => sum + calcShiftHours(s), 0);

      rows.push({
        employee_id: userIdStr,
        hours: Math.round(totalHours * 100) / 100,
        pay_period_start: payPeriodStart,
        pay_period_end: payPeriodEnd,
      });
    }

    return {
      pay_period_start: payPeriodStart,
      pay_period_end: payPeriodEnd,
      rows,
    };
  },
});
