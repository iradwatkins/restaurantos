import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";

export const createCampaign = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    segmentFilter: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const campaignId = await ctx.db.insert("campaigns", {
      tenantId: args.tenantId,
      name: args.name,
      subject: args.subject,
      body: args.body,
      segmentFilter: args.segmentFilter,
      status: "draft",
      recipientCount: 0,
      openCount: 0,
      clickCount: 0,
      createdAt: Date.now(),
    });

    return campaignId;
  },
});

export const updateCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
    name: v.optional(v.string()),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    segmentFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.tenantId !== user.tenantId) throw new Error("Forbidden");
    if (campaign.status !== "draft") {
      throw new Error("Only draft campaigns can be edited");
    }

    const updates: Record<string, string> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.subject !== undefined) updates.subject = args.subject;
    if (args.body !== undefined) updates.body = args.body;
    if (args.segmentFilter !== undefined) updates.segmentFilter = args.segmentFilter;

    await ctx.db.patch(args.campaignId, updates);
    return args.campaignId;
  },
});

export const scheduleCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
    scheduledAt: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.tenantId !== user.tenantId) throw new Error("Forbidden");
    if (campaign.status !== "draft") {
      throw new Error("Only draft campaigns can be scheduled");
    }

    if (args.scheduledAt <= Date.now()) {
      throw new Error("Scheduled time must be in the future");
    }

    await ctx.db.patch(args.campaignId, {
      status: "scheduled",
      scheduledAt: args.scheduledAt,
    });

    return args.campaignId;
  },
});

export const sendCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.tenantId !== user.tenantId) throw new Error("Forbidden");
    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      throw new Error("Campaign must be in draft or scheduled status to send");
    }

    // Mark as sending
    await ctx.db.patch(args.campaignId, { status: "sending" });

    // Fetch customers matching the segment filter
    const allCustomers = await ctx.db
      .query("customers")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", campaign.tenantId))
      .collect();

    // Filter to customers that have an email and match the segment
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

    // Compute high spender threshold (top 10%)
    const sorted = [...allCustomers].sort((a, b) => b.totalSpent - a.totalSpent);
    const cutoffIndex = Math.max(0, Math.ceil(sorted.length * 0.1) - 1);
    const highSpenderThreshold = sorted[cutoffIndex]?.totalSpent ?? 0;

    const matchingCustomers = allCustomers.filter((c) => {
      if (!c.email) return false;

      const daysSinceFirstOrder = now - c.firstOrderDate;
      const daysSinceLastOrder = c.lastOrderDate ? now - c.lastOrderDate : Infinity;

      switch (campaign.segmentFilter) {
        case "New Customers":
          return daysSinceFirstOrder <= THIRTY_DAYS_MS;
        case "Regulars":
          return c.orderCount >= 5;
        case "VIP":
          return c.orderCount >= 10 || c.totalSpent >= 50000;
        case "At Risk":
          return daysSinceLastOrder >= SIXTY_DAYS_MS && c.orderCount >= 2;
        case "Lost":
          return daysSinceLastOrder >= NINETY_DAYS_MS;
        case "High Spenders":
          return c.totalSpent >= highSpenderThreshold;
        default:
          return false;
      }
    });

    // Create recipient records
    for (const customer of matchingCustomers) {
      await ctx.db.insert("campaignRecipients", {
        tenantId: campaign.tenantId,
        campaignId: args.campaignId,
        customerId: customer._id,
        email: customer.email!,
        status: "pending",
      });
    }

    // Mark campaign as sent with recipient count
    await ctx.db.patch(args.campaignId, {
      status: "sent",
      sentAt: now,
      recipientCount: matchingCustomers.length,
    });

    return {
      campaignId: args.campaignId,
      recipientCount: matchingCustomers.length,
    };
  },
});

export const cancelCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.tenantId !== user.tenantId) throw new Error("Forbidden");
    if (campaign.status !== "scheduled") {
      throw new Error("Only scheduled campaigns can be cancelled");
    }

    await ctx.db.patch(args.campaignId, {
      status: "cancelled",
      scheduledAt: undefined,
    });

    return args.campaignId;
  },
});

/**
 * Record an email open event from a tracking pixel.
 * No auth required — called from tracking pixel in email.
 */
export const recordOpen = internalMutation({
  args: {
    recipientId: v.id("campaignRecipients"),
  },
  handler: async (ctx, args) => {
    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) throw new Error("Recipient not found");

    // Only record the first open
    if (recipient.status === "opened" || recipient.status === "clicked") {
      return;
    }

    const now = Date.now();
    await ctx.db.patch(args.recipientId, {
      status: "opened",
      openedAt: now,
    });

    // Increment campaign open count
    const campaign = await ctx.db.get(recipient.campaignId);
    if (campaign) {
      await ctx.db.patch(recipient.campaignId, {
        openCount: campaign.openCount + 1,
      });
    }
  },
});

/**
 * Record a link click event from a tracked link.
 * No auth required — called from redirect endpoint.
 */
export const recordClick = internalMutation({
  args: {
    recipientId: v.id("campaignRecipients"),
  },
  handler: async (ctx, args) => {
    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) throw new Error("Recipient not found");

    // Only record the first click
    if (recipient.status === "clicked") {
      return;
    }

    const wasNotOpened = recipient.status !== "opened";
    const now = Date.now();

    await ctx.db.patch(args.recipientId, {
      status: "clicked",
      openedAt: recipient.openedAt ?? now,
    });

    // Increment campaign click count (and open count if wasn't already opened)
    const campaign = await ctx.db.get(recipient.campaignId);
    if (campaign) {
      const patch: { clickCount: number; openCount?: number } = {
        clickCount: campaign.clickCount + 1,
      };
      if (wasNotOpened) {
        patch.openCount = campaign.openCount + 1;
      }
      await ctx.db.patch(recipient.campaignId, patch);
    }
  },
});
