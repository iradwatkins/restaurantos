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

    // Count orders this month using time-bounded indexed queries per tenant
    // instead of scanning the entire orders table
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const activeTenantList = tenants.filter((t) => t.status === "active");
    const monthOrdersByTenant = await Promise.all(
      activeTenantList.map((tenant) =>
        ctx.db
          .query("orders")
          .withIndex("by_tenantId_createdAt", (q) =>
            q.eq("tenantId", tenant._id).gte("createdAt", monthStart)
          )
          .collect()
      )
    );
    const monthOrders = monthOrdersByTenant.flat();
    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0);

    // Webhook health — use indexed queries per tenant instead of full scan
    const webhooksByTenant = await Promise.all(
      activeTenantList.map((tenant) =>
        ctx.db
          .query("webhookLogs")
          .withIndex("by_tenantId", (q) => q.eq("tenantId", tenant._id))
          .order("desc")
          .take(100)
      )
    );
    const recentWebhooks = webhooksByTenant.flat()
      .sort((a, b) => b.receivedAt - a.receivedAt)
      .slice(0, 100);
    const failedCount = recentWebhooks.filter((w) => w.status === "failed").length;
    const webhookSuccessRate = recentWebhooks.length > 0
      ? Math.round(((recentWebhooks.length - failedCount) / recentWebhooks.length) * 100)
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

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    // Query orders per active tenant using time-bounded index
    // instead of loading entire orders table into memory
    const activeTenants = tenants.filter((t) => t.status === "active");

    const analytics = await Promise.all(
      activeTenants.map(async (tenant) => {
        const tenantOrders = await ctx.db
          .query("orders")
          .withIndex("by_tenantId_createdAt", (q) =>
            q.eq("tenantId", tenant._id).gte("createdAt", monthStart)
          )
          .collect();
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
    );

    return analytics.sort((a, b) => b.revenueCents - a.revenueCents);
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
