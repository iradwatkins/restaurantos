import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "../lib/tenant_auth";

// 34-char set: A-Z minus I,O + digits 2-9
const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 16;
const MAX_COLLISION_RETRIES = 5;
const MIN_AMOUNT_CENTS = 1000; // $10
const MAX_AMOUNT_CENTS = 50000; // $500

/**
 * Generate a random gift card code formatted as XXXX-XXXX-XXXX-XXXX.
 * Uses 34-char alphabet (A-Z minus I,O + 2-9) for readability.
 */
function generateCode(): string {
  const chars: string[] = [];
  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * CODE_CHARSET.length);
    chars.push(CODE_CHARSET[idx]);
  }
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}-${chars.slice(12, 16).join("")}`;
}

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

// ==================== Purchase Gift Card (Public — no auth) ====================

export const purchaseGiftCard = mutation({
  args: {
    tenantId: v.id("tenants"),
    amountCents: v.number(),
    purchaserName: v.string(),
    purchaserEmail: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    recipientEmail: v.optional(v.string()),
    message: v.optional(v.string()),
    isDigital: v.boolean(),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate tenant exists and is active
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant || tenant.status !== "active") {
      throw new Error("Restaurant not found");
    }

    // Validate amount bounds
    if (!Number.isInteger(args.amountCents)) {
      throw new Error("Amount must be a whole number of cents");
    }
    if (args.amountCents < MIN_AMOUNT_CENTS) {
      throw new Error(`Minimum gift card amount is $${MIN_AMOUNT_CENTS / 100}`);
    }
    if (args.amountCents > MAX_AMOUNT_CENTS) {
      throw new Error(`Maximum gift card amount is $${MAX_AMOUNT_CENTS / 100}`);
    }

    // Validate purchaser name
    const purchaserName = args.purchaserName.trim();
    if (!purchaserName) {
      throw new Error("Purchaser name is required");
    }

    // Generate unique code with collision check
    let code = "";
    for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
      const candidate = generateCode();
      const existing = await ctx.db
        .query("giftCards")
        .withIndex("by_code", (q) => q.eq("code", candidate))
        .first();
      if (!existing) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      throw new Error("Failed to generate unique gift card code. Please try again.");
    }

    const now = Date.now();

    // Insert gift card
    const giftCardId = await ctx.db.insert("giftCards", {
      tenantId: args.tenantId,
      code,
      balanceCents: args.amountCents,
      initialAmountCents: args.amountCents,
      status: "active",
      isDigital: args.isDigital,
      purchaserName,
      purchaserEmail: args.purchaserEmail,
      recipientName: args.recipientName,
      recipientEmail: args.recipientEmail,
      message: args.message,
      stripePaymentIntentId: args.stripePaymentIntentId,
      createdAt: now,
    });

    // Insert purchase transaction
    await ctx.db.insert("giftCardTransactions", {
      tenantId: args.tenantId,
      giftCardId,
      type: "purchase",
      amountCents: args.amountCents,
      createdAt: now,
    });

    return { giftCardId, code };
  },
});

// ==================== Redeem Gift Card (Authenticated) ====================

export const redeemGiftCard = mutation({
  args: {
    tenantId: v.id("tenants"),
    code: v.string(),
    amountCents: v.number(),
    orderId: v.optional(v.id("orders")),
    staffId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot redeem gift card for another tenant");
    }

    // Validate tenant
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant || tenant.status !== "active") {
      throw new Error("Restaurant not found");
    }

    // Validate amount
    if (!Number.isInteger(args.amountCents) || args.amountCents <= 0) {
      throw new Error("Redemption amount must be a positive whole number of cents");
    }

    // Normalize and look up code
    const normalizedInput = normalizeCodeForLookup(args.code);
    const formattedCode = formatCode(normalizedInput);

    const card = await ctx.db
      .query("giftCards")
      .withIndex("by_code", (q) => q.eq("code", formattedCode))
      .first();

    if (!card) {
      throw new Error("Gift card not found");
    }
    if (card.tenantId !== args.tenantId) {
      throw new Error("Gift card does not belong to this restaurant");
    }
    if (card.status !== "active") {
      throw new Error(`Gift card is ${card.status}`);
    }
    if (card.balanceCents < args.amountCents) {
      throw new Error(
        `Insufficient balance. Card has $${(card.balanceCents / 100).toFixed(2)} remaining.`
      );
    }

    const now = Date.now();
    const newBalance = card.balanceCents - args.amountCents;
    const newStatus = newBalance === 0 ? ("depleted" as const) : ("active" as const);

    // Update card balance
    await ctx.db.patch(card._id, {
      balanceCents: newBalance,
      status: newStatus,
      lastUsedAt: now,
    });

    // Insert redeem transaction
    await ctx.db.insert("giftCardTransactions", {
      tenantId: args.tenantId,
      giftCardId: card._id,
      type: "redeem",
      amountCents: args.amountCents,
      orderId: args.orderId,
      staffId: args.staffId,
      createdAt: now,
    });

    return { remainingBalanceCents: newBalance, giftCardId: card._id };
  },
});

// ==================== Reload Gift Card (Authenticated) ====================

export const reloadGiftCard = mutation({
  args: {
    tenantId: v.id("tenants"),
    code: v.string(),
    amountCents: v.number(),
    staffId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot reload gift card for another tenant");
    }

    // Validate amount
    if (!Number.isInteger(args.amountCents) || args.amountCents <= 0) {
      throw new Error("Reload amount must be a positive whole number of cents");
    }

    // Normalize and look up code
    const normalizedInput = normalizeCodeForLookup(args.code);
    const formattedCode = formatCode(normalizedInput);

    const card = await ctx.db
      .query("giftCards")
      .withIndex("by_code", (q) => q.eq("code", formattedCode))
      .first();

    if (!card) {
      throw new Error("Gift card not found");
    }
    if (card.tenantId !== args.tenantId) {
      throw new Error("Gift card does not belong to this restaurant");
    }
    if (card.status === "disabled") {
      throw new Error("Cannot reload a disabled gift card");
    }

    const now = Date.now();
    const newBalance = card.balanceCents + args.amountCents;
    const newStatus = card.status === "depleted" ? ("active" as const) : card.status;

    // Update card
    await ctx.db.patch(card._id, {
      balanceCents: newBalance,
      status: newStatus,
    });

    // Insert reload transaction
    await ctx.db.insert("giftCardTransactions", {
      tenantId: args.tenantId,
      giftCardId: card._id,
      type: "reload",
      amountCents: args.amountCents,
      staffId: args.staffId,
      createdAt: now,
    });

    return { newBalanceCents: newBalance };
  },
});

// ==================== Disable Gift Card (Owner/Manager Only) ====================

export const disableGiftCard = mutation({
  args: {
    tenantId: v.id("tenants"),
    giftCardId: v.id("giftCards"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden: cannot disable gift card for another tenant");
    }

    // Only owner/manager can disable
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can disable gift cards");
    }

    const card = await ctx.db.get(args.giftCardId);
    if (!card) {
      throw new Error("Gift card not found");
    }
    if (card.tenantId !== args.tenantId) {
      throw new Error("Gift card does not belong to this restaurant");
    }

    await ctx.db.patch(args.giftCardId, {
      status: "disabled",
    });
  },
});

// ==================== Public Balance Check (No Auth) ====================

export const publicCheckBalance = mutation({
  args: {
    tenantId: v.id("tenants"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate tenant
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant || tenant.status !== "active") {
      throw new Error("Restaurant not found");
    }

    // Normalize and look up code
    const normalizedInput = normalizeCodeForLookup(args.code);
    const formattedCode = formatCode(normalizedInput);

    const card = await ctx.db
      .query("giftCards")
      .withIndex("by_code", (q) => q.eq("code", formattedCode))
      .first();

    if (!card) {
      throw new Error("Gift card not found");
    }
    if (card.tenantId !== args.tenantId) {
      throw new Error("Gift card not found"); // intentionally vague for security
    }

    // Return balance info only — no PII
    return {
      balanceCents: card.balanceCents,
      status: card.status,
      initialAmountCents: card.initialAmountCents,
      isDigital: card.isDigital,
    };
  },
});
