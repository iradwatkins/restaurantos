import { mutation } from "../_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    email: v.string(),
    password: v.string(),
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

    const { password, ...rest } = args;
    const passwordHash = await bcrypt.hash(password, 12);

    return await ctx.db.insert("users", {
      ...rest,
      passwordHash,
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
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const passwordHash = await bcrypt.hash(args.newPassword, 12);
    await ctx.db.patch(args.id, {
      passwordHash,
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
