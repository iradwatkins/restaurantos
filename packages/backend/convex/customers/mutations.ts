import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";

export const createCustomer = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const now = Date.now();

    // Dedup check: phone first, then email
    if (args.phone) {
      const existing = await ctx.db
        .query("customers")
        .withIndex("by_tenantId_phone", (q) =>
          q.eq("tenantId", args.tenantId).eq("phone", args.phone)
        )
        .first();
      if (existing) {
        throw new Error("A customer with this phone number already exists");
      }
    }

    if (args.email) {
      const existing = await ctx.db
        .query("customers")
        .withIndex("by_tenantId_email", (q) =>
          q.eq("tenantId", args.tenantId).eq("email", args.email)
        )
        .first();
      if (existing) {
        throw new Error("A customer with this email already exists");
      }
    }

    const customerId = await ctx.db.insert("customers", {
      tenantId: args.tenantId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      orderCount: 0,
      totalSpent: 0,
      firstOrderDate: now,
      notes: args.notes,
      createdAt: now,
    });

    return customerId;
  },
});

export const updateCustomer = mutation({
  args: {
    customerId: v.id("customers"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new Error("Customer not found");
    if (customer.tenantId !== user.tenantId) throw new Error("Forbidden");

    const updates: Record<string, string> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;
    if (args.phone !== undefined) updates.phone = args.phone;

    // Dedup check for phone if changing
    if (args.phone !== undefined && args.phone !== customer.phone) {
      const existing = await ctx.db
        .query("customers")
        .withIndex("by_tenantId_phone", (q) =>
          q.eq("tenantId", user.tenantId).eq("phone", args.phone)
        )
        .first();
      if (existing && existing._id !== args.customerId) {
        throw new Error("A customer with this phone number already exists");
      }
    }

    // Dedup check for email if changing
    if (args.email !== undefined && args.email !== customer.email) {
      const existing = await ctx.db
        .query("customers")
        .withIndex("by_tenantId_email", (q) =>
          q.eq("tenantId", user.tenantId).eq("email", args.email)
        )
        .first();
      if (existing && existing._id !== args.customerId) {
        throw new Error("A customer with this email already exists");
      }
    }

    await ctx.db.patch(args.customerId, updates);
    return args.customerId;
  },
});

export const addNote = mutation({
  args: {
    customerId: v.id("customers"),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new Error("Customer not found");
    if (customer.tenantId !== user.tenantId) throw new Error("Forbidden");

    await ctx.db.patch(args.customerId, { notes: args.notes });
    return args.customerId;
  },
});
