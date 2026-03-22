import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";

// 12 months in milliseconds for breakage estimate
const TWELVE_MONTHS_MS = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Normalize a gift card code for lookup: uppercase, strip spaces and dashes.
 */
function normalizeCodeForLookup(code: string): string {
  return code.toUpperCase().replace(/[\s-]/g, "");
}

/**
 * Format a raw 16-char code string into XXXX-XXXX-XXXX-XXXX.
 */
function formatCode(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

// ==================== Get Gift Card by Code (Authenticated) ====================

export const getByCode = query({
  args: {
    tenantId: v.id("tenants"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden");
    }

    const normalizedInput = normalizeCodeForLookup(args.code);
    const formattedCode = formatCode(normalizedInput);

    const card = await ctx.db
      .query("giftCards")
      .withIndex("by_code", (q) => q.eq("code", formattedCode))
      .first();

    if (!card || card.tenantId !== args.tenantId) {
      return null;
    }

    // Fetch transaction history
    const transactions = await ctx.db
      .query("giftCardTransactions")
      .withIndex("by_giftCardId", (q) => q.eq("giftCardId", card._id))
      .collect();

    // Sort descending by createdAt
    transactions.sort((a, b) => b.createdAt - a.createdAt);

    return { ...card, transactions };
  },
});

// ==================== Get Transactions for a Card (Authenticated) ====================

export const getTransactions = query({
  args: {
    tenantId: v.id("tenants"),
    giftCardId: v.id("giftCards"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden");
    }

    // Verify card belongs to tenant
    const card = await ctx.db.get(args.giftCardId);
    if (!card || card.tenantId !== args.tenantId) {
      throw new Error("Gift card not found");
    }

    const transactions = await ctx.db
      .query("giftCardTransactions")
      .withIndex("by_giftCardId", (q) => q.eq("giftCardId", args.giftCardId))
      .collect();

    // Sort descending by createdAt
    transactions.sort((a, b) => b.createdAt - a.createdAt);

    return transactions;
  },
});

// ==================== List Gift Cards by Tenant (Authenticated) ====================

export const listByTenant = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.optional(
      v.union(v.literal("active"), v.literal("depleted"), v.literal("disabled"))
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden");
    }

    let cards;
    if (args.status) {
      cards = await ctx.db
        .query("giftCards")
        .withIndex("by_tenantId_status", (q) =>
          q.eq("tenantId", args.tenantId).eq("status", args.status!)
        )
        .collect();
    } else {
      cards = await ctx.db
        .query("giftCards")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
        .collect();
    }

    // Sort by createdAt descending (newest first)
    cards.sort((a, b) => b.createdAt - a.createdAt);

    return cards;
  },
});

// ==================== Liability Report (Authenticated) ====================

export const getLiabilityReport = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden");
    }

    const allCards = await ctx.db
      .query("giftCards")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const now = Date.now();
    const twelveMonthsAgo = now - TWELVE_MONTHS_MS;

    let totalOutstandingCents = 0;
    let totalIssuedCents = 0;
    let activeCardCount = 0;
    let breakageEstimateCents = 0;

    const activeCards: Array<{
      _id: (typeof allCards)[number]["_id"];
      code: string;
      balanceCents: number;
      initialAmountCents: number;
      status: string;
      purchaserName: string;
      createdAt: number;
      lastUsedAt: number | undefined;
    }> = [];

    for (const card of allCards) {
      totalIssuedCents += card.initialAmountCents;

      if (card.status === "active") {
        totalOutstandingCents += card.balanceCents;
        activeCardCount++;

        activeCards.push({
          _id: card._id,
          code: card.code,
          balanceCents: card.balanceCents,
          initialAmountCents: card.initialAmountCents,
          status: card.status,
          purchaserName: card.purchaserName,
          createdAt: card.createdAt,
          lastUsedAt: card.lastUsedAt,
        });

        // Breakage: active cards not used in >12 months
        const lastActivity = card.lastUsedAt ?? card.createdAt;
        if (lastActivity < twelveMonthsAgo) {
          breakageEstimateCents += card.balanceCents;
        }
      }

    }

    // Redeemed = total issued minus remaining active balances
    // Disabled cards are excluded from outstanding but their initial amounts are in totalIssued
    const totalRedeemedCents = totalIssuedCents - totalOutstandingCents;

    const redemptionRate = totalIssuedCents > 0
      ? Math.round((totalRedeemedCents / totalIssuedCents) * 10000) / 100
      : 0;

    // Sort active cards by balance descending for the report table
    activeCards.sort((a, b) => b.balanceCents - a.balanceCents);

    return {
      totalOutstandingCents,
      totalIssuedCents,
      totalRedeemedCents,
      activeCardCount,
      redemptionRate,
      breakageEstimateCents,
      cards: activeCards,
    };
  },
});
