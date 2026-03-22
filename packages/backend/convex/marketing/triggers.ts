import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";
import { Doc } from "../_generated/dataModel";

const triggerTypeValidator = v.union(
  v.literal("birthday"),
  v.literal("inactive_30d"),
  v.literal("inactive_60d"),
  v.literal("anniversary"),
  v.literal("first_order_followup")
);

export const createTrigger = mutation({
  args: {
    tenantId: v.id("tenants"),
    type: triggerTypeValidator,
    templateSubject: v.string(),
    templateBody: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    // Prevent duplicate trigger types per tenant
    const existing = await ctx.db
      .query("automatedTriggers")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const duplicate = existing.find((t) => t.type === args.type);
    if (duplicate) {
      throw new Error(`A trigger of type "${args.type}" already exists for this tenant`);
    }

    const triggerId = await ctx.db.insert("automatedTriggers", {
      tenantId: args.tenantId,
      type: args.type,
      templateSubject: args.templateSubject,
      templateBody: args.templateBody,
      isActive: args.isActive,
      createdAt: Date.now(),
    });

    return triggerId;
  },
});

export const updateTrigger = mutation({
  args: {
    triggerId: v.id("automatedTriggers"),
    templateSubject: v.optional(v.string()),
    templateBody: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const trigger = await ctx.db.get(args.triggerId);
    if (!trigger) throw new Error("Trigger not found");
    if (trigger.tenantId !== user.tenantId) throw new Error("Forbidden");

    const updates: Record<string, string> = {};
    if (args.templateSubject !== undefined) updates.templateSubject = args.templateSubject;
    if (args.templateBody !== undefined) updates.templateBody = args.templateBody;

    await ctx.db.patch(args.triggerId, updates);
    return args.triggerId;
  },
});

export const deleteTrigger = mutation({
  args: {
    triggerId: v.id("automatedTriggers"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const trigger = await ctx.db.get(args.triggerId);
    if (!trigger) throw new Error("Trigger not found");
    if (trigger.tenantId !== user.tenantId) throw new Error("Forbidden");

    await ctx.db.delete(args.triggerId);
    return args.triggerId;
  },
});

export const toggleTrigger = mutation({
  args: {
    triggerId: v.id("automatedTriggers"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const trigger = await ctx.db.get(args.triggerId);
    if (!trigger) throw new Error("Trigger not found");
    if (trigger.tenantId !== user.tenantId) throw new Error("Forbidden");

    await ctx.db.patch(args.triggerId, {
      isActive: !trigger.isActive,
    });

    return { triggerId: args.triggerId, isActive: !trigger.isActive };
  },
});

export const getTriggers = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    return await ctx.db
      .query("automatedTriggers")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

type TriggerType = Doc<"automatedTriggers">["type"];

/**
 * Evaluate which customers match active triggers.
 * Returns trigger-customer pairs that should receive emails.
 */
export const evaluateTriggers = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const triggers = await ctx.db
      .query("automatedTriggers")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const activeTriggers = triggers.filter((t) => t.isActive);
    if (activeTriggers.length === 0) {
      return [];
    }

    const allCustomers = await ctx.db
      .query("customers")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const now = Date.now();
    const results: Array<{
      triggerId: string;
      triggerType: TriggerType;
      templateSubject: string;
      templateBody: string;
      customers: Array<{
        customerId: string;
        name: string;
        email: string;
      }>;
    }> = [];

    for (const trigger of activeTriggers) {
      const matchingCustomers: Array<{
        customerId: string;
        name: string;
        email: string;
      }> = [];

      for (const customer of allCustomers) {
        if (!customer.email) continue;

        const daysSinceLastOrder = customer.lastOrderDate
          ? now - customer.lastOrderDate
          : Infinity;
        const daysSinceFirstOrder = now - customer.firstOrderDate;

        let matches = false;

        switch (trigger.type) {
          case "inactive_30d":
            // No order in 30+ days, but has ordered before
            matches = daysSinceLastOrder >= THIRTY_DAYS_MS && customer.orderCount >= 1;
            break;
          case "inactive_60d":
            // No order in 60+ days, but has ordered before
            matches = daysSinceLastOrder >= SIXTY_DAYS_MS && customer.orderCount >= 1;
            break;
          case "first_order_followup":
            // First order was 1-3 days ago and only 1 order
            matches =
              customer.orderCount === 1 &&
              daysSinceFirstOrder >= 24 * 60 * 60 * 1000 &&
              daysSinceFirstOrder <= 3 * 24 * 60 * 60 * 1000;
            break;
          case "anniversary":
            // First order was approximately 365 days ago (within a 7-day window)
            {
              const yearMs = 365 * 24 * 60 * 60 * 1000;
              const yearsAsCustomer = daysSinceFirstOrder / yearMs;
              const fractionalYear = yearsAsCustomer - Math.floor(yearsAsCustomer);
              // Within 3.5 days of their anniversary
              const windowFraction = (3.5 * 24 * 60 * 60 * 1000) / yearMs;
              matches =
                yearsAsCustomer >= 1 &&
                (fractionalYear <= windowFraction || fractionalYear >= 1 - windowFraction);
            }
            break;
          case "birthday":
            // Birthday matching requires customer birthday data which is not in the schema.
            // This trigger type is reserved for future use when birthday field is added.
            matches = false;
            break;
        }

        if (matches) {
          matchingCustomers.push({
            customerId: customer._id,
            name: customer.name,
            email: customer.email,
          });
        }
      }

      if (matchingCustomers.length > 0) {
        results.push({
          triggerId: trigger._id,
          triggerType: trigger.type,
          templateSubject: trigger.templateSubject,
          templateBody: trigger.templateBody,
          customers: matchingCustomers,
        });
      }
    }

    return results;
  },
});
