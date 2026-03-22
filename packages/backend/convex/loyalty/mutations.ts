import { mutation, MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { requireTenantAccess } from "../lib/tenant_auth";

/**
 * Create a loyalty program for a tenant.
 * Only one active program per tenant is enforced.
 */
export const createProgram = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    pointsPerDollar: v.number(),
    redemptionRules: v.array(
      v.object({
        pointsRequired: v.number(),
        rewardType: v.union(
          v.literal("discount_percentage"),
          v.literal("discount_fixed"),
          v.literal("free_item")
        ),
        rewardValue: v.number(),
        description: v.string(),
      })
    ),
    tiers: v.optional(
      v.array(
        v.object({
          name: v.string(),
          minPoints: v.number(),
          multiplier: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot create program for another tenant");
    }
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can create loyalty programs");
    }

    if (args.pointsPerDollar <= 0) {
      throw new Error("Points per dollar must be greater than zero");
    }

    // Validate redemption rules
    for (const rule of args.redemptionRules) {
      if (rule.pointsRequired <= 0) {
        throw new Error("Points required must be greater than zero");
      }
      if (rule.rewardValue <= 0) {
        throw new Error("Reward value must be greater than zero");
      }
      if (!rule.description.trim()) {
        throw new Error("Redemption rule description cannot be empty");
      }
    }

    // Validate tiers if provided
    if (args.tiers) {
      for (const tier of args.tiers) {
        if (!tier.name.trim()) {
          throw new Error("Tier name cannot be empty");
        }
        if (tier.minPoints < 0) {
          throw new Error("Tier minimum points cannot be negative");
        }
        if (tier.multiplier <= 0) {
          throw new Error("Tier multiplier must be greater than zero");
        }
      }
    }

    // Deactivate any existing active program for this tenant
    const existingPrograms = await ctx.db
      .query("loyaltyPrograms")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    for (const program of existingPrograms) {
      if (program.isActive) {
        await ctx.db.patch(program._id, { isActive: false });
      }
    }

    const programId = await ctx.db.insert("loyaltyPrograms", {
      tenantId: args.tenantId,
      name: args.name,
      pointsPerDollar: args.pointsPerDollar,
      redemptionRules: args.redemptionRules,
      tiers: args.tiers,
      isActive: true,
      createdAt: Date.now(),
    });

    return programId;
  },
});

/**
 * Update an existing loyalty program.
 */
export const updateProgram = mutation({
  args: {
    programId: v.id("loyaltyPrograms"),
    name: v.optional(v.string()),
    pointsPerDollar: v.optional(v.number()),
    redemptionRules: v.optional(
      v.array(
        v.object({
          pointsRequired: v.number(),
          rewardType: v.union(
            v.literal("discount_percentage"),
            v.literal("discount_fixed"),
            v.literal("free_item")
          ),
          rewardValue: v.number(),
          description: v.string(),
        })
      )
    ),
    tiers: v.optional(
      v.array(
        v.object({
          name: v.string(),
          minPoints: v.number(),
          multiplier: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const program = await ctx.db.get(args.programId);
    if (!program) {
      throw new Error("Loyalty program not found");
    }
    if (program.tenantId !== user.tenantId) {
      throw new Error("Forbidden: program belongs to another tenant");
    }
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can update loyalty programs");
    }

    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) {
      if (!args.name.trim()) {
        throw new Error("Program name cannot be empty");
      }
      updates.name = args.name;
    }

    if (args.pointsPerDollar !== undefined) {
      if (args.pointsPerDollar <= 0) {
        throw new Error("Points per dollar must be greater than zero");
      }
      updates.pointsPerDollar = args.pointsPerDollar;
    }

    if (args.redemptionRules !== undefined) {
      for (const rule of args.redemptionRules) {
        if (rule.pointsRequired <= 0) {
          throw new Error("Points required must be greater than zero");
        }
        if (rule.rewardValue <= 0) {
          throw new Error("Reward value must be greater than zero");
        }
        if (!rule.description.trim()) {
          throw new Error("Redemption rule description cannot be empty");
        }
      }
      updates.redemptionRules = args.redemptionRules;
    }

    if (args.tiers !== undefined) {
      for (const tier of args.tiers) {
        if (!tier.name.trim()) {
          throw new Error("Tier name cannot be empty");
        }
        if (tier.minPoints < 0) {
          throw new Error("Tier minimum points cannot be negative");
        }
        if (tier.multiplier <= 0) {
          throw new Error("Tier multiplier must be greater than zero");
        }
      }
      updates.tiers = args.tiers;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No updates provided");
    }

    await ctx.db.patch(args.programId, updates);
  },
});

/**
 * Deactivate a loyalty program.
 * Does not delete — preserves historical data.
 */
export const deactivateProgram = mutation({
  args: {
    programId: v.id("loyaltyPrograms"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const program = await ctx.db.get(args.programId);
    if (!program) {
      throw new Error("Loyalty program not found");
    }
    if (program.tenantId !== user.tenantId) {
      throw new Error("Forbidden: program belongs to another tenant");
    }
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can deactivate loyalty programs");
    }
    if (!program.isActive) {
      throw new Error("Program is already inactive");
    }

    await ctx.db.patch(args.programId, { isActive: false });
  },
});

/**
 * Enroll a customer in the active loyalty program.
 */
export const enrollCustomer = mutation({
  args: {
    tenantId: v.id("tenants"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot enroll customer for another tenant");
    }

    // Verify customer exists and belongs to this tenant
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }
    if (customer.tenantId !== args.tenantId) {
      throw new Error("Forbidden: customer belongs to another tenant");
    }

    // Find active program
    const programs = await ctx.db
      .query("loyaltyPrograms")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const activeProgram = programs.find((p) => p.isActive);
    if (!activeProgram) {
      throw new Error("No active loyalty program found for this tenant");
    }

    // Check if already enrolled
    const existing = await ctx.db
      .query("loyaltyAccounts")
      .withIndex("by_tenantId_customerId", (q) =>
        q.eq("tenantId", args.tenantId).eq("customerId", args.customerId)
      )
      .first();

    if (existing) {
      throw new Error("Customer is already enrolled in the loyalty program");
    }

    const accountId = await ctx.db.insert("loyaltyAccounts", {
      tenantId: args.tenantId,
      customerId: args.customerId,
      programId: activeProgram._id,
      currentPoints: 0,
      lifetimePoints: 0,
      createdAt: Date.now(),
    });

    return accountId;
  },
});

/**
 * Earn points from an order.
 * Auto-calculates points from order total and program rules.
 * Applies tier multiplier if the customer has one.
 */
export const earnPoints = mutation({
  args: {
    tenantId: v.id("tenants"),
    accountId: v.id("loyaltyAccounts"),
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot earn points for another tenant");
    }

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Loyalty account not found");
    }
    if (account.tenantId !== args.tenantId) {
      throw new Error("Forbidden: loyalty account belongs to another tenant");
    }

    const program = await ctx.db.get(account.programId);
    if (!program || !program.isActive) {
      throw new Error("Loyalty program is not active");
    }

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    if (order.tenantId !== args.tenantId) {
      throw new Error("Forbidden: order belongs to another tenant");
    }

    // Check for duplicate earn on the same order
    const existingTransactions = await ctx.db
      .query("loyaltyTransactions")
      .withIndex("by_accountId_createdAt", (q) =>
        q.eq("accountId", args.accountId)
      )
      .collect();

    const alreadyEarned = existingTransactions.some(
      (t) => t.orderId === args.orderId && t.type === "earn"
    );
    if (alreadyEarned) {
      throw new Error("Points have already been earned for this order");
    }

    // Calculate points: order subtotal in dollars * pointsPerDollar
    const orderDollars = order.subtotal / 100;
    let basePoints = Math.floor(orderDollars * program.pointsPerDollar);

    // Apply tier multiplier if applicable
    let multiplier = 1;
    if (account.currentTier && program.tiers) {
      const currentTier = program.tiers.find(
        (t) => t.name === account.currentTier
      );
      if (currentTier) {
        multiplier = currentTier.multiplier;
      }
    }

    const earnedPoints = Math.floor(basePoints * multiplier);
    if (earnedPoints <= 0) {
      return { earnedPoints: 0 };
    }

    const newCurrentPoints = account.currentPoints + earnedPoints;
    const newLifetimePoints = account.lifetimePoints + earnedPoints;

    // Determine new tier based on lifetime points
    let newTier: string | undefined = account.currentTier;
    if (program.tiers && program.tiers.length > 0) {
      // Sort tiers descending by minPoints to find the highest qualifying tier
      const sortedTiers = [...program.tiers].sort(
        (a, b) => b.minPoints - a.minPoints
      );
      const qualifyingTier = sortedTiers.find(
        (t) => newLifetimePoints >= t.minPoints
      );
      newTier = qualifyingTier?.name;
    }

    await ctx.db.patch(args.accountId, {
      currentPoints: newCurrentPoints,
      lifetimePoints: newLifetimePoints,
      currentTier: newTier,
    });

    await ctx.db.insert("loyaltyTransactions", {
      tenantId: args.tenantId,
      accountId: args.accountId,
      orderId: args.orderId,
      type: "earn",
      points: earnedPoints,
      description: `Earned ${earnedPoints} points from order #${order.orderNumber}`,
      createdAt: Date.now(),
    });

    return { earnedPoints, newCurrentPoints, newLifetimePoints, newTier };
  },
});

/**
 * Redeem points for a reward.
 * Returns the discount to apply to the order.
 */
export const redeemPoints = mutation({
  args: {
    tenantId: v.id("tenants"),
    accountId: v.id("loyaltyAccounts"),
    ruleIndex: v.number(), // index into the program's redemptionRules array
    orderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot redeem points for another tenant");
    }

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Loyalty account not found");
    }
    if (account.tenantId !== args.tenantId) {
      throw new Error("Forbidden: loyalty account belongs to another tenant");
    }

    const program = await ctx.db.get(account.programId);
    if (!program || !program.isActive) {
      throw new Error("Loyalty program is not active");
    }

    if (
      args.ruleIndex < 0 ||
      args.ruleIndex >= program.redemptionRules.length
    ) {
      throw new Error("Invalid redemption rule index");
    }

    const rule = program.redemptionRules[args.ruleIndex];
    if (!rule) {
      throw new Error("Redemption rule not found");
    }

    if (account.currentPoints < rule.pointsRequired) {
      throw new Error(
        `Insufficient points: need ${rule.pointsRequired}, have ${account.currentPoints}`
      );
    }

    // Deduct points
    const newCurrentPoints = account.currentPoints - rule.pointsRequired;
    await ctx.db.patch(args.accountId, {
      currentPoints: newCurrentPoints,
    });

    await ctx.db.insert("loyaltyTransactions", {
      tenantId: args.tenantId,
      accountId: args.accountId,
      orderId: args.orderId,
      type: "redeem",
      points: -rule.pointsRequired,
      description: `Redeemed ${rule.pointsRequired} points: ${rule.description}`,
      createdAt: Date.now(),
    });

    // If there's an order, apply the discount
    if (args.orderId) {
      const order = await ctx.db.get(args.orderId);
      if (order && order.tenantId === args.tenantId) {
        if (rule.rewardType === "discount_percentage") {
          const discountAmount = Math.round(
            order.subtotal * (rule.rewardValue / 100)
          );
          const newTotal = Math.max(0, order.total - discountAmount);
          await ctx.db.patch(args.orderId, {
            discountType: "percentage",
            discountValue: rule.rewardValue,
            discountAmount,
            discountReason: `Loyalty reward: ${rule.description}`,
            total: newTotal,
            updatedAt: Date.now(),
          });
        } else if (rule.rewardType === "discount_fixed") {
          const discountAmount = Math.min(rule.rewardValue, order.subtotal);
          const newTotal = Math.max(0, order.total - discountAmount);
          await ctx.db.patch(args.orderId, {
            discountType: "fixed",
            discountValue: rule.rewardValue,
            discountAmount,
            discountReason: `Loyalty reward: ${rule.description}`,
            total: newTotal,
            updatedAt: Date.now(),
          });
        }
        // free_item type: no automatic discount applied — staff handles manually
      }
    }

    return {
      pointsDeducted: rule.pointsRequired,
      newCurrentPoints,
      rewardType: rule.rewardType,
      rewardValue: rule.rewardValue,
      description: rule.description,
    };
  },
});

/**
 * Manual point adjustment with reason (for corrections, bonuses, etc.).
 * Accepts either accountId directly or customerId (will resolve the account).
 */
export const adjustPoints = mutation({
  args: {
    tenantId: v.optional(v.id("tenants")),
    accountId: v.optional(v.id("loyaltyAccounts")),
    customerId: v.optional(v.id("customers")),
    points: v.number(), // positive to add, negative to deduct
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (args.tenantId && user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot adjust points for another tenant");
    }
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can adjust loyalty points");
    }

    if (args.points === 0) {
      throw new Error("Adjustment points cannot be zero");
    }
    if (!args.reason.trim()) {
      throw new Error("Adjustment reason is required");
    }

    // Resolve the loyalty account — either from accountId or customerId
    let account;
    if (args.accountId) {
      account = await ctx.db.get(args.accountId);
      if (!account) {
        throw new Error("Loyalty account not found");
      }
      if (account.tenantId !== user.tenantId) {
        throw new Error("Forbidden: loyalty account belongs to another tenant");
      }
    } else if (args.customerId) {
      const customer = await ctx.db.get(args.customerId);
      if (!customer) {
        throw new Error("Customer not found");
      }
      if (customer.tenantId !== user.tenantId) {
        throw new Error("Forbidden: customer belongs to another tenant");
      }
      account = await ctx.db
        .query("loyaltyAccounts")
        .withIndex("by_tenantId_customerId", (q) =>
          q.eq("tenantId", user.tenantId).eq("customerId", args.customerId!)
        )
        .first();
      if (!account) {
        throw new Error("Customer is not enrolled in the loyalty program");
      }
    } else {
      throw new Error("Either accountId or customerId is required");
    }

    const newCurrentPoints = account.currentPoints + args.points;
    if (newCurrentPoints < 0) {
      throw new Error(
        `Cannot deduct ${Math.abs(args.points)} points: account only has ${account.currentPoints}`
      );
    }

    const updates: Record<string, unknown> = {
      currentPoints: newCurrentPoints,
    };

    // Only increase lifetime points on positive adjustments
    if (args.points > 0) {
      updates.lifetimePoints = account.lifetimePoints + args.points;

      // Recalculate tier
      const program = await ctx.db.get(account.programId);
      if (program && program.tiers && program.tiers.length > 0) {
        const newLifetime = account.lifetimePoints + args.points;
        const sortedTiers = [...program.tiers].sort(
          (a, b) => b.minPoints - a.minPoints
        );
        const qualifyingTier = sortedTiers.find(
          (t) => newLifetime >= t.minPoints
        );
        updates.currentTier = qualifyingTier?.name;
      }
    }

    await ctx.db.patch(account._id, updates);

    await ctx.db.insert("loyaltyTransactions", {
      tenantId: user.tenantId,
      accountId: account._id,
      type: "adjust",
      points: args.points,
      description: `Manual adjustment: ${args.reason}`,
      createdAt: Date.now(),
    });

    return { newCurrentPoints };
  },
});

/**
 * Helper: find the active loyalty program for a tenant.
 */
async function getActiveProgram(
  ctx: MutationCtx,
  tenantId: Id<"tenants">
) {
  const programs = await ctx.db
    .query("loyaltyPrograms")
    .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
    .collect();

  return programs.find((p) => p.isActive) ?? null;
}

/**
 * Helper: parse a synthetic ID and get the loyalty program document.
 * Validates tenant ownership.
 */
async function getProgramFromSyntheticId(
  ctx: MutationCtx,
  syntheticId: string,
  separator: string,
  userTenantId: Id<"tenants">
) {
  const separatorIdx = syntheticId.indexOf(separator);
  if (separatorIdx === -1) {
    throw new Error(`Invalid ID format (expected "${separator}" separator)`);
  }
  const programId = syntheticId.slice(0, separatorIdx) as Id<"loyaltyPrograms">;
  const indexStr = syntheticId.slice(separatorIdx + separator.length);
  const index = parseInt(indexStr, 10);

  if (isNaN(index) || index < 0) {
    throw new Error("Invalid index in ID");
  }

  const program = await ctx.db.get(programId);
  if (!program) {
    throw new Error("Loyalty program not found");
  }
  if (program.tenantId !== userTenantId) {
    throw new Error("Forbidden: program belongs to another tenant");
  }

  return { program, index };
}

/**
 * Update loyalty settings (enabled state and points-per-dollar).
 * Enabling creates a default program if none exists.
 * Disabling deactivates the current program.
 */
export const updateSettings = mutation({
  args: {
    tenantId: v.id("tenants"),
    enabled: v.boolean(),
    pointsPerDollar: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot update settings for another tenant");
    }
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can update loyalty settings");
    }

    if (args.pointsPerDollar < 0) {
      throw new Error("Points per dollar cannot be negative");
    }

    const activeProgram = await getActiveProgram(ctx, args.tenantId);

    if (args.enabled) {
      if (activeProgram) {
        // Update existing program
        await ctx.db.patch(activeProgram._id, {
          pointsPerDollar: args.pointsPerDollar,
        });
      } else {
        // Create a new default program
        await ctx.db.insert("loyaltyPrograms", {
          tenantId: args.tenantId,
          name: "Loyalty Program",
          pointsPerDollar: args.pointsPerDollar,
          redemptionRules: [],
          isActive: true,
          createdAt: Date.now(),
        });
      }
    } else {
      // Disable: deactivate the active program
      if (activeProgram) {
        await ctx.db.patch(activeProgram._id, { isActive: false });
      }
    }
  },
});

/**
 * Create a new reward (redemption rule) in the active program.
 */
export const createReward = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    pointsRequired: v.number(),
    rewardType: v.union(
      v.literal("discount_percentage"),
      v.literal("discount_fixed"),
      v.literal("free_item")
    ),
    value: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot create reward for another tenant");
    }
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can create rewards");
    }

    if (!args.name.trim()) {
      throw new Error("Reward name cannot be empty");
    }
    if (args.pointsRequired <= 0) {
      throw new Error("Points required must be greater than zero");
    }
    if (args.value < 0) {
      throw new Error("Reward value cannot be negative");
    }

    const activeProgram = await getActiveProgram(ctx, args.tenantId);
    if (!activeProgram) {
      throw new Error("No active loyalty program found");
    }

    const newRule = {
      pointsRequired: args.pointsRequired,
      rewardType: args.rewardType,
      rewardValue: args.value,
      description: args.description?.trim() || args.name.trim(),
    };

    await ctx.db.patch(activeProgram._id, {
      redemptionRules: [...activeProgram.redemptionRules, newRule],
    });
  },
});

/**
 * Update an existing reward in the active program.
 * rewardId format: "{programId}:reward:{index}"
 */
export const updateReward = mutation({
  args: {
    rewardId: v.string(),
    name: v.optional(v.string()),
    pointsRequired: v.optional(v.number()),
    rewardType: v.optional(
      v.union(
        v.literal("discount_percentage"),
        v.literal("discount_fixed"),
        v.literal("free_item")
      )
    ),
    value: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can update rewards");
    }

    const { program, index } = await getProgramFromSyntheticId(
      ctx, args.rewardId, ":reward:", user.tenantId
    );

    if (index >= program.redemptionRules.length) {
      throw new Error("Invalid reward index");
    }

    const updatedRules = [...program.redemptionRules];
    const existing = updatedRules[index];
    if (!existing) {
      throw new Error("Reward not found at index");
    }

    if (args.pointsRequired !== undefined && args.pointsRequired <= 0) {
      throw new Error("Points required must be greater than zero");
    }
    if (args.value !== undefined && args.value < 0) {
      throw new Error("Reward value cannot be negative");
    }

    updatedRules[index] = {
      pointsRequired: args.pointsRequired ?? existing.pointsRequired,
      rewardType: args.rewardType ?? existing.rewardType,
      rewardValue: args.value ?? existing.rewardValue,
      description:
        args.description?.trim() ??
        args.name?.trim() ??
        existing.description,
    };

    await ctx.db.patch(program._id, { redemptionRules: updatedRules });
  },
});

/**
 * Delete a reward from the active program.
 * rewardId format: "{programId}:reward:{index}"
 */
export const deleteReward = mutation({
  args: {
    rewardId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can delete rewards");
    }

    const { program, index } = await getProgramFromSyntheticId(
      ctx, args.rewardId, ":reward:", user.tenantId
    );

    if (index >= program.redemptionRules.length) {
      throw new Error("Invalid reward index");
    }

    const updatedRules = program.redemptionRules.filter(
      (_rule, i) => i !== index
    );
    await ctx.db.patch(program._id, { redemptionRules: updatedRules });
  },
});

/**
 * Create a new tier in the active program.
 */
export const createTier = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    minPoints: v.number(),
    multiplier: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot create tier for another tenant");
    }
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can create tiers");
    }

    if (!args.name.trim()) {
      throw new Error("Tier name cannot be empty");
    }
    if (args.minPoints < 0) {
      throw new Error("Minimum points cannot be negative");
    }
    if (args.multiplier <= 0) {
      throw new Error("Tier multiplier must be greater than zero");
    }

    const activeProgram = await getActiveProgram(ctx, args.tenantId);
    if (!activeProgram) {
      throw new Error("No active loyalty program found");
    }

    const existingTiers = activeProgram.tiers ?? [];
    const duplicate = existingTiers.find(
      (t) => t.name.toLowerCase() === args.name.trim().toLowerCase()
    );
    if (duplicate) {
      throw new Error(`A tier named "${args.name.trim()}" already exists`);
    }

    const newTier = {
      name: args.name.trim(),
      minPoints: args.minPoints,
      multiplier: args.multiplier,
    };

    await ctx.db.patch(activeProgram._id, {
      tiers: [...existingTiers, newTier],
    });
  },
});

/**
 * Update an existing tier in the active program.
 * tierId format: "{programId}:tier:{index}"
 */
export const updateTier = mutation({
  args: {
    tierId: v.string(),
    name: v.optional(v.string()),
    minPoints: v.optional(v.number()),
    multiplier: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can update tiers");
    }

    const { program, index } = await getProgramFromSyntheticId(
      ctx, args.tierId, ":tier:", user.tenantId
    );

    const tiers = program.tiers ?? [];
    if (index >= tiers.length) {
      throw new Error("Invalid tier index");
    }

    const existing = tiers[index];
    if (!existing) {
      throw new Error("Tier not found at index");
    }

    if (args.name !== undefined && !args.name.trim()) {
      throw new Error("Tier name cannot be empty");
    }
    if (args.minPoints !== undefined && args.minPoints < 0) {
      throw new Error("Minimum points cannot be negative");
    }
    if (args.multiplier !== undefined && args.multiplier <= 0) {
      throw new Error("Tier multiplier must be greater than zero");
    }

    const updatedTiers = [...tiers];
    updatedTiers[index] = {
      name: args.name?.trim() ?? existing.name,
      minPoints: args.minPoints ?? existing.minPoints,
      multiplier: args.multiplier ?? existing.multiplier,
    };

    await ctx.db.patch(program._id, { tiers: updatedTiers });
  },
});

/**
 * Delete a tier from the active program.
 * tierId format: "{programId}:tier:{index}"
 */
export const deleteTier = mutation({
  args: {
    tierId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can delete tiers");
    }

    const { program, index } = await getProgramFromSyntheticId(
      ctx, args.tierId, ":tier:", user.tenantId
    );

    const tiers = program.tiers ?? [];
    if (index >= tiers.length) {
      throw new Error("Invalid tier index");
    }

    const updatedTiers = tiers.filter((_tier, i) => i !== index);
    await ctx.db.patch(program._id, { tiers: updatedTiers });
  },
});

/**
 * Redeem a reward for a customer.
 * Accepts customerId and a synthetic rewardId, returns discountCents.
 * This is a customer-facing wrapper around the lower-level redeemPoints.
 */
export const redeemReward = mutation({
  args: {
    customerId: v.id("customers"),
    rewardId: v.string(),
    orderTotal: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }
    if (customer.tenantId !== user.tenantId) {
      throw new Error("Forbidden: customer belongs to another tenant");
    }

    // Parse rewardId: "{programId}:reward:{index}"
    const { program, index: ruleIndex } = await getProgramFromSyntheticId(
      ctx, args.rewardId, ":reward:", user.tenantId
    );

    if (!program.isActive) {
      throw new Error("Loyalty program is not active");
    }
    if (ruleIndex >= program.redemptionRules.length) {
      throw new Error("Invalid reward index");
    }

    const rule = program.redemptionRules[ruleIndex];
    if (!rule) {
      throw new Error("Reward rule not found");
    }

    // Find the customer's loyalty account
    const account = await ctx.db
      .query("loyaltyAccounts")
      .withIndex("by_tenantId_customerId", (q) =>
        q
          .eq("tenantId", user.tenantId)
          .eq("customerId", args.customerId)
      )
      .first();

    if (!account) {
      throw new Error("Customer is not enrolled in the loyalty program");
    }

    if (account.currentPoints < rule.pointsRequired) {
      throw new Error(
        `Insufficient points: need ${rule.pointsRequired}, have ${account.currentPoints}`
      );
    }

    // Deduct points
    const newCurrentPoints = account.currentPoints - rule.pointsRequired;
    await ctx.db.patch(account._id, {
      currentPoints: newCurrentPoints,
    });

    // Record the transaction
    await ctx.db.insert("loyaltyTransactions", {
      tenantId: user.tenantId,
      accountId: account._id,
      type: "redeem",
      points: -rule.pointsRequired,
      description: `Redeemed ${rule.pointsRequired} points: ${rule.description}`,
      createdAt: Date.now(),
    });

    // Calculate discount
    let discountCents = 0;
    if (rule.rewardType === "discount_percentage") {
      discountCents = Math.round(args.orderTotal * (rule.rewardValue / 100));
    } else if (rule.rewardType === "discount_fixed") {
      discountCents = Math.min(rule.rewardValue, args.orderTotal);
    }
    // free_item: discountCents stays 0, handled by staff

    return { discountCents };
  },
});
