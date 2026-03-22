import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";

export const getDiscounts = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx);

    return await ctx.db
      .query("discounts")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const getActiveDiscounts = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx);

    const all = await ctx.db
      .query("discounts")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return all.filter((d) => d.isActive);
  },
});
