import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";

export const getCampaigns = query({
  args: {
    tenantId: v.id("tenants"),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) throw new Error("Forbidden");

    const pageSize = args.limit ?? 50;

    const allCampaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_tenantId_createdAt", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();

    let startIndex = 0;
    if (args.cursor) {
      const cursorIdx = allCampaigns.findIndex((c) => c._id === args.cursor);
      if (cursorIdx >= 0) {
        startIndex = cursorIdx + 1;
      }
    }

    const page = allCampaigns.slice(startIndex, startIndex + pageSize);
    const nextCursor = page.length === pageSize ? page[page.length - 1]!._id : null;

    return {
      campaigns: page.map((c) => ({
        _id: c._id,
        name: c.name,
        subject: c.subject,
        segmentFilter: c.segmentFilter,
        status: c.status,
        scheduledAt: c.scheduledAt,
        sentAt: c.sentAt,
        recipientCount: c.recipientCount,
        openCount: c.openCount,
        clickCount: c.clickCount,
        createdAt: c.createdAt,
      })),
      nextCursor,
      totalCount: allCampaigns.length,
    };
  },
});

export const getCampaign = query({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.tenantId !== user.tenantId) throw new Error("Forbidden");

    // Fetch recipient stats
    const recipients = await ctx.db
      .query("campaignRecipients")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const statusCounts = {
      pending: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
    };

    for (const r of recipients) {
      statusCounts[r.status]++;
    }

    return {
      ...campaign,
      recipientStats: statusCounts,
      totalRecipients: recipients.length,
    };
  },
});

export const getCampaignAnalytics = query({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.tenantId !== user.tenantId) throw new Error("Forbidden");

    const recipients = await ctx.db
      .query("campaignRecipients")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const total = recipients.length;
    if (total === 0) {
      return {
        campaignId: args.campaignId,
        recipientCount: 0,
        deliveredCount: 0,
        openedCount: 0,
        clickedCount: 0,
        bouncedCount: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        clickToOpenRate: 0,
      };
    }

    let deliveredCount = 0;
    let openedCount = 0;
    let clickedCount = 0;
    let bouncedCount = 0;

    for (const r of recipients) {
      // "delivered", "opened", and "clicked" all count as delivered
      if (r.status === "delivered" || r.status === "opened" || r.status === "clicked") {
        deliveredCount++;
      }
      if (r.status === "opened" || r.status === "clicked") {
        openedCount++;
      }
      if (r.status === "clicked") {
        clickedCount++;
      }
      if (r.status === "bounced") {
        bouncedCount++;
      }
    }

    // Also count from campaign-level counters (may be more accurate for incrementally tracked opens/clicks)
    const effectiveOpened = Math.max(openedCount, campaign.openCount);
    const effectiveClicked = Math.max(clickedCount, campaign.clickCount);

    return {
      campaignId: args.campaignId,
      recipientCount: total,
      deliveredCount,
      openedCount: effectiveOpened,
      clickedCount: effectiveClicked,
      bouncedCount,
      deliveryRate: Math.round((deliveredCount / total) * 10000) / 100,
      openRate: total > 0 ? Math.round((effectiveOpened / total) * 10000) / 100 : 0,
      clickRate: total > 0 ? Math.round((effectiveClicked / total) * 10000) / 100 : 0,
      clickToOpenRate: effectiveOpened > 0
        ? Math.round((effectiveClicked / effectiveOpened) * 10000) / 100
        : 0,
    };
  },
});
