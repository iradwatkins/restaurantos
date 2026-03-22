import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";

/**
 * Get accounting integration settings for a tenant.
 * Derives connection state from tenant fields.
 */
export const getSettings = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot view settings for another tenant");
    }

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const provider = tenant.accountingProvider ?? "none";

    let isConnected = false;
    let connectedOrgName: string | undefined;
    let connectedRealmId: string | undefined;

    if (provider === "quickbooks") {
      isConnected = !!tenant.quickbooksAccessToken && !!tenant.quickbooksRealmId;
      connectedRealmId = tenant.quickbooksRealmId;
    } else if (provider === "xero") {
      isConnected = !!tenant.xeroAccessToken && !!tenant.xeroTenantId;
      connectedOrgName = tenant.xeroTenantId;
    }

    return {
      provider,
      isConnected,
      autoSyncEnabled: tenant.accountingAutoSyncEnabled ?? false,
      lastSyncTime: tenant.accountingLastSyncTime,
      connectedOrgName,
      connectedRealmId,
    };
  },
});

/**
 * Get recent accounting sync history entries.
 */
export const getSyncHistory = query({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot view sync history for another tenant");
    }

    const logs = await ctx.db
      .query("accountingSyncLogs")
      .withIndex("by_tenantId_timestamp", (q) =>
        q.eq("tenantId", args.tenantId)
      )
      .order("desc")
      .collect();

    const pageLimit = args.limit ?? 20;
    return logs.slice(0, pageLimit);
  },
});
