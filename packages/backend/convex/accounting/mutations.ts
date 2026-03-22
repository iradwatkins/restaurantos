import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";

/**
 * Update the accounting provider for a tenant.
 */
export const updateProvider = mutation({
  args: {
    tenantId: v.id("tenants"),
    provider: v.union(
      v.literal("quickbooks"),
      v.literal("xero"),
      v.literal("none")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot update provider for another tenant");
    }
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can update accounting settings");
    }

    await ctx.db.patch(args.tenantId, {
      accountingProvider: args.provider,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Disconnect the accounting provider by clearing credentials.
 */
export const disconnect = mutation({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot disconnect provider for another tenant");
    }
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can disconnect accounting");
    }

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    await ctx.db.patch(args.tenantId, {
      accountingProvider: "none",
      quickbooksAccessToken: undefined,
      quickbooksRefreshToken: undefined,
      quickbooksRealmId: undefined,
      quickbooksConnectedAt: undefined,
      xeroAccessToken: undefined,
      xeroRefreshToken: undefined,
      xeroTenantId: undefined,
      xeroConnectedAt: undefined,
      accountingAutoSyncEnabled: false,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Trigger a manual accounting sync.
 * Records a sync log entry. In production, this would call an external
 * sync service via an action; for now it records the sync attempt.
 */
export const triggerSync = mutation({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot trigger sync for another tenant");
    }
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can trigger accounting syncs");
    }

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const provider = tenant.accountingProvider ?? "none";
    if (provider === "none") {
      throw new Error("No accounting provider configured");
    }

    // Verify connection exists
    if (provider === "quickbooks" && !tenant.quickbooksAccessToken) {
      throw new Error("QuickBooks is not connected");
    }
    if (provider === "xero" && !tenant.xeroAccessToken) {
      throw new Error("Xero is not connected");
    }

    const now = Date.now();

    // Record the sync attempt
    await ctx.db.insert("accountingSyncLogs", {
      tenantId: args.tenantId,
      syncType: "manual",
      status: "success",
      recordsSynced: 0,
      timestamp: now,
    });

    await ctx.db.patch(args.tenantId, {
      accountingLastSyncTime: now,
      updatedAt: now,
    });
  },
});

/**
 * Toggle auto-sync on/off for accounting.
 */
export const toggleAutoSync = mutation({
  args: {
    tenantId: v.id("tenants"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot update auto-sync for another tenant");
    }
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can toggle auto-sync");
    }

    await ctx.db.patch(args.tenantId, {
      accountingAutoSyncEnabled: args.enabled,
      updatedAt: Date.now(),
    });
  },
});
