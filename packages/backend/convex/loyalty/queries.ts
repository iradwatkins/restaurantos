import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";

/**
 * Get the active loyalty program for a tenant.
 */
export const getProgram = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot view program for another tenant");
    }

    const programs = await ctx.db
      .query("loyaltyPrograms")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return programs.find((p) => p.isActive) ?? null;
  },
});

/**
 * Get a loyalty account by its ID.
 */
export const getAccount = query({
  args: {
    accountId: v.id("loyaltyAccounts"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const account = await ctx.db.get(args.accountId);
    if (!account) {
      return null;
    }
    if (account.tenantId !== user.tenantId) {
      throw new Error("Forbidden: loyalty account belongs to another tenant");
    }
    return account;
  },
});

/**
 * Look up a loyalty account by customer ID.
 */
export const getAccountByCustomer = query({
  args: {
    tenantId: v.id("tenants"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot view account for another tenant");
    }

    return await ctx.db
      .query("loyaltyAccounts")
      .withIndex("by_tenantId_customerId", (q) =>
        q.eq("tenantId", args.tenantId).eq("customerId", args.customerId)
      )
      .first();
  },
});

/**
 * Get transaction history for a loyalty account.
 * Returns transactions ordered by most recent first.
 */
export const getTransactionHistory = query({
  args: {
    accountId: v.id("loyaltyAccounts"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Loyalty account not found");
    }
    if (account.tenantId !== user.tenantId) {
      throw new Error("Forbidden: loyalty account belongs to another tenant");
    }

    const transactions = await ctx.db
      .query("loyaltyTransactions")
      .withIndex("by_accountId_createdAt", (q) =>
        q.eq("accountId", args.accountId)
      )
      .order("desc")
      .collect();

    const pageLimit = args.limit ?? 50;
    return transactions.slice(0, pageLimit);
  },
});

/**
 * Get top loyalty members by lifetime points (leaderboard).
 */
export const getLeaderboard = query({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot view leaderboard for another tenant");
    }

    const accounts = await ctx.db
      .query("loyaltyAccounts")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Sort by lifetime points descending
    accounts.sort((a, b) => b.lifetimePoints - a.lifetimePoints);

    const pageLimit = args.limit ?? 20;
    const topAccounts = accounts.slice(0, pageLimit);

    // Enrich with customer names
    const results = [];
    for (const account of topAccounts) {
      const customer = await ctx.db.get(account.customerId);
      results.push({
        ...account,
        customerName: customer?.name ?? "Unknown",
        customerEmail: customer?.email,
        customerPhone: customer?.phone,
      });
    }

    return results;
  },
});

/**
 * Get loyalty settings for a tenant.
 * Derives enabled/pointsPerDollar from the active loyalty program.
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

    const programs = await ctx.db
      .query("loyaltyPrograms")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const activeProgram = programs.find((p) => p.isActive);
    if (!activeProgram) {
      return { enabled: false, pointsPerDollar: 1 };
    }

    return {
      enabled: true,
      pointsPerDollar: activeProgram.pointsPerDollar,
    };
  },
});

/**
 * Get redemption rules (rewards) from the active loyalty program.
 * Each rule is enriched with a synthetic _id (the array index encoded as a string)
 * and a `name` field derived from description, plus `value` aliased from rewardValue.
 */
export const getRewards = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot view rewards for another tenant");
    }

    const programs = await ctx.db
      .query("loyaltyPrograms")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const activeProgram = programs.find((p) => p.isActive);
    if (!activeProgram) {
      return [];
    }

    return activeProgram.redemptionRules.map((rule, index) => ({
      _id: `${activeProgram._id}:reward:${index}`,
      name: rule.description,
      pointsRequired: rule.pointsRequired,
      rewardType: rule.rewardType,
      value: rule.rewardValue,
      description: rule.description,
    }));
  },
});

/**
 * Get tiers from the active loyalty program.
 * Each tier is enriched with a synthetic _id.
 */
export const getTiers = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot view tiers for another tenant");
    }

    const programs = await ctx.db
      .query("loyaltyPrograms")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const activeProgram = programs.find((p) => p.isActive);
    if (!activeProgram || !activeProgram.tiers) {
      return [];
    }

    return activeProgram.tiers.map((tier, index) => ({
      _id: `${activeProgram._id}:tier:${index}`,
      name: tier.name,
      minPoints: tier.minPoints,
      multiplier: tier.multiplier,
    }));
  },
});

/**
 * Get loyalty data for a specific customer.
 * Returns current points, lifetime points, tier name, and tier multiplier.
 * Uses the customer's tenantId to find the active program and account.
 */
export const getCustomerLoyalty = query({
  args: {
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      return null;
    }
    if (customer.tenantId !== user.tenantId) {
      throw new Error("Forbidden: customer belongs to another tenant");
    }

    const account = await ctx.db
      .query("loyaltyAccounts")
      .withIndex("by_tenantId_customerId", (q) =>
        q.eq("tenantId", user.tenantId).eq("customerId", args.customerId)
      )
      .first();

    if (!account) {
      return null;
    }

    // Look up tier multiplier from the program
    let tierName = account.currentTier ?? "Base";
    let tierMultiplier = 1;

    const program = await ctx.db.get(account.programId);
    if (program && program.tiers && account.currentTier) {
      const tier = program.tiers.find((t) => t.name === account.currentTier);
      if (tier) {
        tierMultiplier = tier.multiplier;
      }
    }

    return {
      currentPoints: account.currentPoints,
      lifetimePoints: account.lifetimePoints,
      tierName,
      tierMultiplier,
    };
  },
});

/**
 * Get transaction history for a customer by customer ID.
 * Finds the loyalty account for the customer and returns transactions.
 */
export const getCustomerTransactions = query({
  args: {
    customerId: v.id("customers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      return [];
    }
    if (customer.tenantId !== user.tenantId) {
      throw new Error("Forbidden: customer belongs to another tenant");
    }

    const account = await ctx.db
      .query("loyaltyAccounts")
      .withIndex("by_tenantId_customerId", (q) =>
        q.eq("tenantId", user.tenantId).eq("customerId", args.customerId)
      )
      .first();

    if (!account) {
      return [];
    }

    const transactions = await ctx.db
      .query("loyaltyTransactions")
      .withIndex("by_accountId_createdAt", (q) =>
        q.eq("accountId", account._id)
      )
      .order("desc")
      .collect();

    const pageLimit = args.limit ?? 50;
    return transactions.slice(0, pageLimit);
  },
});
