import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const createAdminUser = mutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    name: v.optional(v.string()),
    role: v.union(
      v.literal("super_admin"),
      v.literal("support"),
      v.literal("viewer")
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("adminUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("Admin user with this email already exists");
    }

    return await ctx.db.insert("adminUsers", {
      ...args,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateLastLogin = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("adminUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (user) {
      await ctx.db.patch(user._id, { lastLoginAt: Date.now() });
    }
  },
});

// ==================== Tenant Management ====================

export const updateTenant = mutation({
  args: {
    id: v.id("tenants"),
    name: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("suspended"),
        v.literal("trial"),
        v.literal("churned")
      )
    ),
    plan: v.optional(
      v.union(v.literal("starter"), v.literal("growth"), v.literal("pro"))
    ),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    features: v.optional(
      v.object({
        onlineOrdering: v.optional(v.boolean()),
        catering: v.optional(v.boolean()),
        loyalty: v.optional(v.boolean()),
        marketing: v.optional(v.boolean()),
        reservations: v.optional(v.boolean()),
        analytics: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    cleanUpdates.updatedAt = Date.now();
    await ctx.db.patch(id, cleanUpdates);
  },
});

export const suspendTenant = mutation({
  args: { id: v.id("tenants") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "suspended", updatedAt: Date.now() });
    await ctx.db.insert("auditLogs", {
      action: "update",
      entityType: "tenant",
      entityId: args.id,
      userType: "admin",
      newValues: { status: "suspended" },
      createdAt: Date.now(),
    });
  },
});

export const activateTenant = mutation({
  args: { id: v.id("tenants") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "active", updatedAt: Date.now() });
    await ctx.db.insert("auditLogs", {
      action: "update",
      entityType: "tenant",
      entityId: args.id,
      userType: "admin",
      newValues: { status: "active" },
      createdAt: Date.now(),
    });
  },
});

export const deleteTenant = mutation({
  args: { id: v.id("tenants") },
  handler: async (ctx, args) => {
    // Soft delete — set status to churned
    await ctx.db.patch(args.id, { status: "churned", updatedAt: Date.now() });
    await ctx.db.insert("auditLogs", {
      action: "delete",
      entityType: "tenant",
      entityId: args.id,
      userType: "admin",
      createdAt: Date.now(),
    });
  },
});

export const bulkUpdateStatus = mutation({
  args: {
    ids: v.array(v.id("tenants")),
    status: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("trial"),
      v.literal("churned")
    ),
  },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.patch(id, { status: args.status, updatedAt: Date.now() });
    }
  },
});
