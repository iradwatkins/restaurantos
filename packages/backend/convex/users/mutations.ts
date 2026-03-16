import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    email: v.string(),
    passwordHash: v.string(),
    name: v.optional(v.string()),
    role: v.union(
      v.literal("owner"),
      v.literal("manager"),
      v.literal("server"),
      v.literal("cashier")
    ),
  },
  handler: async (ctx, args) => {
    // Check uniqueness within tenant
    const existing = await ctx.db
      .query("users")
      .withIndex("by_tenantId_email", (q) =>
        q.eq("tenantId", args.tenantId).eq("email", args.email)
      )
      .first();

    if (existing) {
      throw new Error("User with this email already exists for this tenant");
    }

    return await ctx.db.insert("users", {
      ...args,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateLastLogin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { lastLoginAt: Date.now() });
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("owner"),
        v.literal("manager"),
        v.literal("server"),
        v.literal("cashier")
      )
    ),
    status: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const resetPassword = mutation({
  args: {
    id: v.id("users"),
    newPasswordHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      passwordHash: args.newPasswordHash,
      updatedAt: Date.now(),
    });
  },
});

export const deactivate = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "inactive",
      updatedAt: Date.now(),
    });
  },
});
