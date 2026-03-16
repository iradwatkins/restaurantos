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

// ==================== Tenant Management ====================

export const listTenantsFiltered = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    plan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let tenants = await ctx.db.query("tenants").collect();

    if (args.search) {
      const s = args.search.toLowerCase();
      tenants = tenants.filter(
        (t) =>
          t.name.toLowerCase().includes(s) ||
          t.subdomain.toLowerCase().includes(s) ||
          (t.email ?? "").toLowerCase().includes(s)
      );
    }
    if (args.status) {
      tenants = tenants.filter((t) => t.status === args.status);
    }
    if (args.plan) {
      tenants = tenants.filter((t) => t.plan === args.plan);
    }

    return tenants.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },
});

// ==================== Analytics ====================

export const getSystemHealth = query({
  handler: async (ctx) => {
    const tenants = await ctx.db.query("tenants").collect();
    const activeTenants = tenants.filter((t) => t.status === "active").length;

    // Count orders this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const allOrders = await ctx.db.query("orders").collect();
    const monthOrders = allOrders.filter((o) => o.createdAt >= monthStart);
    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0);

    // Webhook health
    const recentWebhooks = await ctx.db.query("webhookLogs").collect();
    const last100 = recentWebhooks.slice(-100);
    const failedCount = last100.filter((w) => w.status === "failed").length;
    const webhookSuccessRate = last100.length > 0
      ? Math.round(((last100.length - failedCount) / last100.length) * 100)
      : 100;

    // Plan distribution
    const planCounts: Record<string, number> = {};
    for (const t of tenants) {
      planCounts[t.plan] = (planCounts[t.plan] ?? 0) + 1;
    }

    return {
      totalTenants: tenants.length,
      activeTenants,
      monthOrders: monthOrders.length,
      monthRevenueCents: monthRevenue,
      webhookSuccessRate,
      planCounts,
    };
  },
});

export const getTenantAnalytics = query({
  handler: async (ctx) => {
    const tenants = await ctx.db.query("tenants").collect();
    const allOrders = await ctx.db.query("orders").collect();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const analytics = tenants
      .filter((t) => t.status === "active")
      .map((tenant) => {
        const tenantOrders = allOrders.filter(
          (o) => o.tenantId === tenant._id && o.createdAt >= monthStart
        );
        const revenue = tenantOrders.reduce((sum, o) => sum + o.total, 0);

        return {
          _id: tenant._id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          plan: tenant.plan,
          orderCount: tenantOrders.length,
          revenueCents: revenue,
        };
      })
      .sort((a, b) => b.revenueCents - a.revenueCents);

    return analytics;
  },
});

// ==================== Audit Logs ====================

export const getAuditLogs = query({
  args: {
    tenantId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let logs;
    if (args.tenantId) {
      logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
        .collect();
    } else {
      logs = await ctx.db.query("auditLogs").collect();
    }

    // Sort by newest first and limit
    const sorted = logs.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return sorted.slice(0, args.limit ?? 100);
  },
});
