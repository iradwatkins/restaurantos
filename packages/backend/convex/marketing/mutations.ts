import { mutation, internalMutation, MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { requireTenantAccess } from "../lib/tenant_auth";

const channelValidator = v.optional(
  v.union(v.literal("email"), v.literal("sms"), v.literal("both"))
);

export const createCampaign = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    segmentFilter: v.string(),
    channel: channelValidator,
    smsBody: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const channel = args.channel ?? "email";

    // Validate: SMS campaigns require smsBody
    if ((channel === "sms" || channel === "both") && !args.smsBody) {
      throw new Error("smsBody is required for SMS or multi-channel campaigns");
    }

    const campaignId = await ctx.db.insert("campaigns", {
      tenantId: args.tenantId,
      name: args.name,
      subject: args.subject,
      body: args.body,
      segmentFilter: args.segmentFilter,
      channel,
      smsBody: args.smsBody,
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
    channel: channelValidator,
    smsBody: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.tenantId !== user.tenantId) throw new Error("Forbidden");
    if (campaign.status !== "draft") {
      throw new Error("Only draft campaigns can be edited");
    }

    const updates: Record<string, string | undefined> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.subject !== undefined) updates.subject = args.subject;
    if (args.body !== undefined) updates.body = args.body;
    if (args.segmentFilter !== undefined) updates.segmentFilter = args.segmentFilter;
    if (args.channel !== undefined) updates.channel = args.channel;
    if (args.smsBody !== undefined) updates.smsBody = args.smsBody;

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

/**
 * Check SMS rate limits for a customer.
 * Returns true if the customer can receive an SMS, false if rate-limited.
 *
 * Limits: max 1 SMS per customer per day, max 4 per customer per month.
 */
async function checkSmsRateLimit(
  ctx: MutationCtx,
  customerId: Id<"customers">
): Promise<boolean> {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const recentLogs = await ctx.db
    .query("smsDeliveryLogs")
    .withIndex("by_customerId_createdAt", (q) =>
      q.eq("customerId", customerId).gte("createdAt", thirtyDaysAgo)
    )
    .collect();

  const sentToday = recentLogs.filter(
    (log) => log.createdAt >= oneDayAgo && log.status !== "failed"
  ).length;

  if (sentToday >= 1) return false;

  const sentThisMonth = recentLogs.filter(
    (log) => log.status !== "failed"
  ).length;

  if (sentThisMonth >= 4) return false;

  return true;
}

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

    const channel = campaign.channel ?? "email";

    // Validate SMS body exists for SMS campaigns
    if ((channel === "sms" || channel === "both") && !campaign.smsBody) {
      throw new Error("Campaign smsBody is required for SMS channel");
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

    const matchesSegment = (c: (typeof allCustomers)[number]): boolean => {
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
    };

    let totalRecipients = 0;

    // Create email recipients
    if (channel === "email" || channel === "both") {
      const emailCustomers = allCustomers.filter(
        (c) => c.email && matchesSegment(c)
      );

      for (const customer of emailCustomers) {
        await ctx.db.insert("campaignRecipients", {
          tenantId: campaign.tenantId,
          campaignId: args.campaignId,
          customerId: customer._id,
          email: customer.email!,
          channel: "email",
          status: "pending",
        });
      }
      totalRecipients += emailCustomers.length;
    }

    // Create SMS recipients
    if (channel === "sms" || channel === "both") {
      const smsEligible = allCustomers.filter(
        (c) =>
          c.phone &&
          c.smsConsent === true &&
          c.smsOptedOut !== true &&
          matchesSegment(c)
      );

      for (const customer of smsEligible) {
        // Check SMS rate limits before creating recipient
        const withinLimit = await checkSmsRateLimit(ctx, customer._id);
        if (!withinLimit) continue;

        await ctx.db.insert("campaignRecipients", {
          tenantId: campaign.tenantId,
          campaignId: args.campaignId,
          customerId: customer._id,
          email: customer.email ?? "",
          channel: "sms",
          phone: customer.phone!,
          status: "pending",
        });
        totalRecipients++;
      }
    }

    // Mark campaign as sent with recipient count
    await ctx.db.patch(args.campaignId, {
      status: "sent",
      sentAt: now,
      recipientCount: totalRecipients,
    });

    return {
      campaignId: args.campaignId,
      recipientCount: totalRecipients,
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
 * Process an SMS opt-out (STOP) or opt-in (START) for a phone number.
 * Called by Twilio webhook when a customer replies STOP/START.
 */
export const processSmsOptOut = mutation({
  args: {
    tenantId: v.id("tenants"),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    // Find customer by phone within this tenant
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_tenantId_phone", (q) =>
        q.eq("tenantId", args.tenantId).eq("phone", args.phone)
      )
      .collect();

    if (customers.length === 0) {
      // No matching customer — log but don't fail
      return { found: false, phone: args.phone };
    }

    for (const customer of customers) {
      await ctx.db.patch(customer._id, {
        smsOptedOut: true,
      });
    }

    return { found: true, count: customers.length, phone: args.phone };
  },
});

/**
 * Re-enable SMS consent when customer replies START.
 */
export const processSmsOptIn = mutation({
  args: {
    tenantId: v.id("tenants"),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_tenantId_phone", (q) =>
        q.eq("tenantId", args.tenantId).eq("phone", args.phone)
      )
      .collect();

    if (customers.length === 0) {
      return { found: false, phone: args.phone };
    }

    const now = Date.now();
    for (const customer of customers) {
      await ctx.db.patch(customer._id, {
        smsConsent: true,
        smsConsentAt: now,
        smsOptedOut: false,
      });
    }

    return { found: true, count: customers.length, phone: args.phone };
  },
});

/**
 * Create an SMS delivery log entry.
 * Used by the API route after sending each SMS.
 */
export const createSmsDeliveryLog = mutation({
  args: {
    tenantId: v.id("tenants"),
    customerId: v.optional(v.id("customers")),
    campaignId: v.optional(v.id("campaigns")),
    triggerId: v.optional(v.id("automatedTriggers")),
    phone: v.string(),
    message: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("opted_out")
    ),
    twilioSid: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("smsDeliveryLogs", args);
  },
});

/**
 * Update a campaign recipient's status.
 * Used by the API route after sending SMS.
 */
export const updateRecipientStatus = mutation({
  args: {
    recipientId: v.id("campaignRecipients"),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("bounced"),
      v.literal("failed")
    ),
    sentAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, string | number> = { status: args.status };
    if (args.sentAt !== undefined) updates.sentAt = args.sentAt;
    await ctx.db.patch(args.recipientId, updates);
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
