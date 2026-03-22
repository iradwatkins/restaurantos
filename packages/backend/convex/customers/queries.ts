import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";
import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

export const getCustomers = query({
  args: {
    tenantId: v.id("tenants"),
    search: v.optional(v.string()),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const pageSize = args.limit ?? 50;

    const allCustomers = await ctx.db
      .query("customers")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter by search term if provided (name, email, phone)
    let filtered: Doc<"customers">[];
    if (args.search && args.search.trim().length > 0) {
      const term = args.search.trim().toLowerCase();
      filtered = allCustomers.filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(term);
        const emailMatch = c.email ? c.email.toLowerCase().includes(term) : false;
        const phoneMatch = c.phone ? c.phone.includes(term) : false;
        return nameMatch || emailMatch || phoneMatch;
      });
    } else {
      filtered = allCustomers;
    }

    // Sort by totalSpent descending (highest-value customers first)
    filtered.sort((a, b) => b.totalSpent - a.totalSpent);

    // Cursor-based pagination using customer _id
    let startIndex = 0;
    if (args.cursor) {
      const cursorIdx = filtered.findIndex((c) => c._id === args.cursor);
      if (cursorIdx >= 0) {
        startIndex = cursorIdx + 1;
      }
    }

    const page = filtered.slice(startIndex, startIndex + pageSize);
    const nextCursor = page.length === pageSize ? page[page.length - 1]!._id : null;

    return {
      customers: page,
      nextCursor,
      totalCount: filtered.length,
    };
  },
});

export const getCustomer = query({
  args: {
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new Error("Customer not found");
    if (customer.tenantId !== user.tenantId) throw new Error("Forbidden");

    // Fetch order history for this customer by phone or email
    const allOrders = await ctx.db
      .query("orders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", user.tenantId))
      .collect();

    const customerOrders = allOrders.filter((o) => {
      if (customer.phone && o.customerPhone === customer.phone) return true;
      if (customer.email && o.customerEmail === customer.email) return true;
      return false;
    });

    // Sort by most recent first
    customerOrders.sort((a, b) => b.createdAt - a.createdAt);

    // Limit to most recent 50 orders
    const recentOrders = customerOrders.slice(0, 50).map((o) => ({
      orderId: o._id,
      orderNumber: o.orderNumber,
      source: o.source,
      status: o.status,
      total: o.total,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
    }));

    return {
      ...customer,
      recentOrders,
    };
  },
});

export const searchCustomers = query({
  args: {
    tenantId: v.id("tenants"),
    search: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const term = args.search.trim().toLowerCase();
    if (term.length === 0) return [];

    // Try phone index first for exact/prefix phone lookups
    const isPhoneLookup = /^\d/.test(term);

    if (isPhoneLookup) {
      const allByTenant = await ctx.db
        .query("customers")
        .withIndex("by_tenantId_phone", (q) => q.eq("tenantId", args.tenantId))
        .collect();

      return allByTenant
        .filter((c) => c.phone && c.phone.includes(term))
        .slice(0, 10)
        .map((c) => ({
          _id: c._id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          orderCount: c.orderCount,
          totalSpent: c.totalSpent,
        }));
    }

    // Name/email search
    const allByTenant = await ctx.db
      .query("customers")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return allByTenant
      .filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(term);
        const emailMatch = c.email ? c.email.toLowerCase().includes(term) : false;
        const phoneMatch = c.phone ? c.phone.includes(term) : false;
        return nameMatch || emailMatch || phoneMatch;
      })
      .slice(0, 10)
      .map((c) => ({
        _id: c._id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        orderCount: c.orderCount,
        totalSpent: c.totalSpent,
      }));
  },
});

// ==================== Customer Segmentation ====================

type SegmentName =
  | "New Customers"
  | "Regulars"
  | "VIP"
  | "At Risk"
  | "Lost"
  | "High Spenders";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Determine which segments a customer belongs to.
 * A customer can belong to multiple segments simultaneously.
 */
function classifyCustomer(
  customer: Doc<"customers">,
  now: number,
  highSpenderThreshold: number
): SegmentName[] {
  const segments: SegmentName[] = [];

  const daysSinceFirstOrder = now - customer.firstOrderDate;
  const daysSinceLastOrder = customer.lastOrderDate
    ? now - customer.lastOrderDate
    : Infinity;

  // "New Customers" — first order in last 30 days
  if (daysSinceFirstOrder <= THIRTY_DAYS_MS) {
    segments.push("New Customers");
  }

  // "Regulars" — 5+ orders
  if (customer.orderCount >= 5) {
    segments.push("Regulars");
  }

  // "VIP" — 10+ orders OR $500+ total spend (50000 cents)
  if (customer.orderCount >= 10 || customer.totalSpent >= 50000) {
    segments.push("VIP");
  }

  // "At Risk" — no order in 60+ days, had 2+ orders
  if (daysSinceLastOrder >= SIXTY_DAYS_MS && customer.orderCount >= 2) {
    segments.push("At Risk");
  }

  // "Lost" — no order in 90+ days
  if (daysSinceLastOrder >= NINETY_DAYS_MS) {
    segments.push("Lost");
  }

  // "High Spenders" — top 10% by total spend (threshold passed in)
  if (customer.totalSpent >= highSpenderThreshold) {
    segments.push("High Spenders");
  }

  return segments;
}

/**
 * Calculate the top-10% spend threshold for high spenders.
 * Returns the minimum totalSpent needed to be in the top 10%.
 */
function computeHighSpenderThreshold(customers: Doc<"customers">[]): number {
  if (customers.length === 0) return 0;
  const sorted = [...customers].sort((a, b) => b.totalSpent - a.totalSpent);
  const cutoffIndex = Math.max(0, Math.ceil(sorted.length * 0.1) - 1);
  const cutoffCustomer = sorted[cutoffIndex];
  return cutoffCustomer ? cutoffCustomer.totalSpent : 0;
}

/**
 * Fetch all customers for a tenant (reusable helper).
 */
async function fetchAllCustomersForTenant(
  ctx: QueryCtx,
  tenantId: Id<"tenants">
): Promise<Doc<"customers">[]> {
  return await ctx.db
    .query("customers")
    .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
    .collect();
}

export const getSegments = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const allCustomers = await fetchAllCustomersForTenant(ctx, args.tenantId);
    const now = Date.now();
    const highSpenderThreshold = computeHighSpenderThreshold(allCustomers);

    const segmentNames: SegmentName[] = [
      "New Customers",
      "Regulars",
      "VIP",
      "At Risk",
      "Lost",
      "High Spenders",
    ];

    const counts: Record<SegmentName, number> = {
      "New Customers": 0,
      "Regulars": 0,
      "VIP": 0,
      "At Risk": 0,
      "Lost": 0,
      "High Spenders": 0,
    };

    for (const customer of allCustomers) {
      const customerSegments = classifyCustomer(customer, now, highSpenderThreshold);
      for (const seg of customerSegments) {
        counts[seg]++;
      }
    }

    return segmentNames.map((name) => ({
      name,
      count: counts[name],
    }));
  },
});

export const getCustomersBySegment = query({
  args: {
    tenantId: v.id("tenants"),
    segment: v.string(),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const segmentName = args.segment as SegmentName;
    const allCustomers = await fetchAllCustomersForTenant(ctx, args.tenantId);
    const now = Date.now();
    const highSpenderThreshold = computeHighSpenderThreshold(allCustomers);

    const filtered = allCustomers.filter((c) => {
      const segments = classifyCustomer(c, now, highSpenderThreshold);
      return segments.includes(segmentName);
    });

    // Sort by totalSpent descending
    filtered.sort((a, b) => b.totalSpent - a.totalSpent);

    const pageSize = args.limit ?? 50;
    let startIndex = 0;
    if (args.cursor) {
      const cursorIdx = filtered.findIndex((c) => c._id === args.cursor);
      if (cursorIdx >= 0) {
        startIndex = cursorIdx + 1;
      }
    }

    const page = filtered.slice(startIndex, startIndex + pageSize);
    const nextCursor = page.length === pageSize ? page[page.length - 1]!._id : null;

    return {
      customers: page,
      nextCursor,
      totalCount: filtered.length,
    };
  },
});

export const getSegmentStats = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const allCustomers = await fetchAllCustomersForTenant(ctx, args.tenantId);
    const now = Date.now();
    const highSpenderThreshold = computeHighSpenderThreshold(allCustomers);

    const segmentNames: SegmentName[] = [
      "New Customers",
      "Regulars",
      "VIP",
      "At Risk",
      "Lost",
      "High Spenders",
    ];

    const segmentData: Record<SegmentName, { totalSpent: number; totalOrders: number; count: number }> = {
      "New Customers": { totalSpent: 0, totalOrders: 0, count: 0 },
      "Regulars": { totalSpent: 0, totalOrders: 0, count: 0 },
      "VIP": { totalSpent: 0, totalOrders: 0, count: 0 },
      "At Risk": { totalSpent: 0, totalOrders: 0, count: 0 },
      "Lost": { totalSpent: 0, totalOrders: 0, count: 0 },
      "High Spenders": { totalSpent: 0, totalOrders: 0, count: 0 },
    };

    for (const customer of allCustomers) {
      const customerSegments = classifyCustomer(customer, now, highSpenderThreshold);
      for (const seg of customerSegments) {
        segmentData[seg].totalSpent += customer.totalSpent;
        segmentData[seg].totalOrders += customer.orderCount;
        segmentData[seg].count++;
      }
    }

    return segmentNames.map((name) => {
      const data = segmentData[name];
      return {
        name,
        count: data.count,
        avgSpend: data.count > 0 ? Math.round(data.totalSpent / data.count) : 0,
        avgOrders: data.count > 0 ? Math.round((data.totalOrders / data.count) * 100) / 100 : 0,
      };
    });
  },
});
