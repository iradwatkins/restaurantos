import { mutation } from "../_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { validateEmail, validatePasswordComplexity } from "../lib/validators";
import { requireTenantAccess, assertTenantOwnership } from "../lib/tenant_auth";

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
    // Only authenticated users with tenant access (owner/manager) can create users
    const currentUser = await requireTenantAccess(ctx);
    // Verify the caller belongs to the target tenant
    if (currentUser.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot create users for another tenant");
    }
    // Only owners and managers can create new users
    if (currentUser.role !== "owner" && currentUser.role !== "manager") {
      throw new Error("Forbidden: only owners and managers can create users");
    }
    // Managers cannot create owner-role users (privilege escalation prevention)
    if (currentUser.role === "manager" && args.role === "owner") {
      throw new Error("Forbidden: managers cannot create owner-role users");
    }

    validateEmail(args.email);
    validatePasswordComplexity(args.password);

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
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended"))),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireTenantAccess(ctx);
    const targetUser = await ctx.db.get(args.id);
    assertTenantOwnership(targetUser, currentUser.tenantId);

    if (args.email) {
      validateEmail(args.email);
    }
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
    const currentUser = await requireTenantAccess(ctx);
    const targetUser = await ctx.db.get(args.id);
    assertTenantOwnership(targetUser, currentUser.tenantId);

    validatePasswordComplexity(args.newPassword);
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
    const currentUser = await requireTenantAccess(ctx);
    const targetUser = await ctx.db.get(args.id);
    assertTenantOwnership(targetUser, currentUser.tenantId);

    await ctx.db.patch(args.id, {
      status: "inactive",
      updatedAt: Date.now(),
    });
  },
});
