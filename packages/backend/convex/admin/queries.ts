import { query } from "../_generated/server";
import { v } from "convex/values";

export const getAdminByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("adminUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const listAdminUsers = query({
  handler: async (ctx) => {
    return await ctx.db.query("adminUsers").collect();
  },
});
