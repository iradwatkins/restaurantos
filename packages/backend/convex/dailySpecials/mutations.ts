import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
  args: {
    tenantId: v.id("tenants"),
    dayOfWeek: v.number(),
    name: v.string(),
    description: v.optional(v.string()),
    items: v.array(
      v.object({
        name: v.string(),
        description: v.optional(v.string()),
        price: v.number(),
      })
    ),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if one already exists for this day
    const existing = await ctx.db
      .query("dailySpecials")
      .withIndex("by_tenantId_dayOfWeek", (q) =>
        q.eq("tenantId", args.tenantId).eq("dayOfWeek", args.dayOfWeek)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        description: args.description,
        items: args.items,
        startTime: args.startTime,
        endTime: args.endTime,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("dailySpecials", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const toggleActive = mutation({
  args: { id: v.id("dailySpecials") },
  handler: async (ctx, args) => {
    const special = await ctx.db.get(args.id);
    if (!special) throw new Error("Not found");
    await ctx.db.patch(args.id, { isActive: !special.isActive, updatedAt: Date.now() });
  },
});

export const deleteSpecial = mutation({
  args: { id: v.id("dailySpecials") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
