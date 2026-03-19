import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Atomically generate the next order number for a tenant on a given day.
 * Uses the `orderCounters` table to ensure uniqueness even under concurrent writes.
 * Convex mutations are serialized per-document, so read-then-write on the same
 * counter document is safe from race conditions.
 */
export async function getNextOrderNumber(
  ctx: MutationCtx,
  tenantId: Id<"tenants">
): Promise<number> {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const counter = await ctx.db
    .query("orderCounters")
    .withIndex("by_tenantId_date", (q) =>
      q.eq("tenantId", tenantId).eq("date", date)
    )
    .unique();

  if (counter) {
    const nextNumber = counter.count + 1;
    await ctx.db.patch(counter._id, { count: nextNumber });
    return nextNumber;
  }

  // First order of the day — create counter
  await ctx.db.insert("orderCounters", {
    tenantId,
    date,
    count: 1,
  });
  return 1;
}
