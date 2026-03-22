import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireSuperAdmin } from "../lib/auth";
import { requireTenantAccess, assertTenantOwnership } from "../lib/tenant_auth";
// assertTenantOwnership is used for sub-documents (themes) that have a tenantId field.
// For tenant documents themselves, we compare user.tenantId against the tenant _id directly.

export const create = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    subdomain: v.string(),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("suspended"),
        v.literal("trial"),
        v.literal("churned")
      )
    ),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    fontFamily: v.optional(v.string()),
    deliveryMode: v.optional(
      v.union(v.literal("kitchenhub"), v.literal("direct_api"))
    ),
    timezone: v.optional(v.string()),
    currency: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(
      v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zip: v.string(),
        country: v.string(),
      })
    ),
    features: v.optional(
      v.object({
        onlineOrdering: v.optional(v.boolean()),
        catering: v.optional(v.boolean()),
        loyalty: v.optional(v.boolean()),
        marketing: v.optional(v.boolean()),
        reservations: v.optional(v.boolean()),
        analytics: v.optional(v.boolean()),
      })
    ),
    plan: v.optional(
      v.union(v.literal("starter"), v.literal("growth"), v.literal("pro"))
    ),
  },
  handler: async (ctx, args) => {
    // Only super admins can create new tenants
    await requireSuperAdmin(ctx);

    // Check subdomain uniqueness
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", args.subdomain))
      .first();

    if (existing) {
      throw new Error("Subdomain already taken");
    }

    const tenantId = await ctx.db.insert("tenants", {
      slug: args.slug,
      name: args.name,
      subdomain: args.subdomain,
      status: args.status ?? "active",
      logoUrl: args.logoUrl,
      primaryColor: args.primaryColor,
      accentColor: args.accentColor,
      fontFamily: args.fontFamily,
      deliveryMode: args.deliveryMode ?? "kitchenhub",
      timezone: args.timezone ?? "America/New_York",
      currency: args.currency ?? "USD",
      phone: args.phone,
      email: args.email,
      address: args.address,
      features: args.features ?? {},
      plan: args.plan ?? "growth",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create default theme
    await ctx.db.insert("tenantThemes", {
      tenantId,
      name: "Default",
      isActive: true,
      background: "0 0% 100%",
      foreground: "222.2 84% 4.9%",
      primaryColor: "0 72% 51%",
      primaryForeground: "210 40% 98%",
      secondary: "210 40% 96.1%",
      secondaryForeground: "222.2 47.4% 11.2%",
      accent: "210 40% 96.1%",
      accentForeground: "222.2 47.4% 11.2%",
      muted: "210 40% 96.1%",
      mutedForeground: "215.4 16.3% 46.9%",
      card: "0 0% 100%",
      cardForeground: "222.2 84% 4.9%",
      popover: "0 0% 100%",
      popoverForeground: "222.2 84% 4.9%",
      border: "214.3 31.8% 91.4%",
      input: "214.3 31.8% 91.4%",
      ring: "0 72% 51%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "210 40% 98%",
      createdAt: Date.now(),
    });

    // Create delivery config
    await ctx.db.insert("deliveryConfigs", {
      tenantId,
      mode: args.deliveryMode ?? "kitchenhub",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return tenantId;
  },
});

export const update = mutation({
  args: {
    id: v.id("tenants"),
    name: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("suspended"),
        v.literal("trial"),
        v.literal("churned")
      )
    ),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    plan: v.optional(
      v.union(v.literal("starter"), v.literal("growth"), v.literal("pro"))
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    // Tenant docs don't have a tenantId field — the _id IS the tenant.
    // Verify the caller's tenant matches the target tenant.
    if (user.tenantId !== args.id) {
      throw new Error("Forbidden");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const updateSettings = mutation({
  args: {
    id: v.id("tenants"),
    taxRate: v.optional(v.number()),
    businessHours: v.optional(
      v.array(
        v.object({
          day: v.number(),
          open: v.string(),
          close: v.string(),
          isClosed: v.boolean(),
        })
      )
    ),
    holidayHours: v.optional(
      v.array(
        v.object({
          date: v.string(),
          open: v.optional(v.string()),
          close: v.optional(v.string()),
          isClosed: v.boolean(),
          label: v.optional(v.string()),
        })
      )
    ),
    liquorLicenseNumber: v.optional(v.string()),
    liquorLicenseExpiry: v.optional(v.number()),
    alcoholSaleHoursStart: v.optional(v.string()),
    alcoholSaleHoursEnd: v.optional(v.string()),
    onlineOrderingSettings: v.optional(
      v.object({
        enabled: v.boolean(),
        minimumOrderCents: v.optional(v.number()),
        pickupTimeSlotMinutes: v.optional(v.number()),
        defaultPrepTimeMinutes: v.optional(v.number()),
      })
    ),
    tagline: v.optional(v.string()),
    aboutText: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(
      v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zip: v.string(),
        country: v.string(),
      })
    ),
    timezone: v.optional(v.string()),
    // Website settings
    websiteEnabled: v.optional(v.boolean()),
    heroImageStorageId: v.optional(v.id("_storage")),
    featuredItemIds: v.optional(v.array(v.id("menuItems"))),
    socialLinks: v.optional(
      v.object({
        facebook: v.optional(v.string()),
        instagram: v.optional(v.string()),
        twitter: v.optional(v.string()),
        yelp: v.optional(v.string()),
      })
    ),
    googleMapsEmbedUrl: v.optional(v.string()),
    // Website content (configurable per-tenant)
    heroHeading: v.optional(v.string()),
    heroSubheading: v.optional(v.string()),
    deliveryMessage: v.optional(v.string()),
    deliveryPartners: v.optional(
      v.array(v.object({ name: v.string(), color: v.string() }))
    ),
    footerTagline: v.optional(v.string()),
    // Own Delivery Settings
    deliveryEnabled: v.optional(v.boolean()),
    deliveryFee: v.optional(v.number()),
    deliveryMinimum: v.optional(v.number()),
    deliveryRadius: v.optional(v.number()),
    deliveryZones: v.optional(
      v.array(
        v.object({
          name: v.string(),
          zipCodes: v.array(v.string()),
          fee: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.id) {
      throw new Error("Forbidden");
    }

    const { id, ...updates } = args;
    // Filter out undefined values so we only patch what was provided
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    cleanUpdates.updatedAt = Date.now();
    await ctx.db.patch(id, cleanUpdates);
  },
});

export const updateTheme = mutation({
  args: {
    themeId: v.id("tenantThemes"),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const theme = await ctx.db.get(args.themeId);
    if (!theme) {
      throw new Error("Theme not found");
    }
    assertTenantOwnership(theme, user.tenantId);

    await ctx.db.patch(args.themeId, { ...args.updates, updatedAt: Date.now() });
  },
});

export const updateBranding = mutation({
  args: {
    id: v.id("tenants"),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    fontFamily: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.id) {
      throw new Error("Forbidden");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const switchDeliveryMode = mutation({
  args: {
    tenantId: v.id("tenants"),
    mode: v.union(v.literal("kitchenhub"), v.literal("direct_api")),
    switchedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden");
    }

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    const config = await ctx.db
      .query("deliveryConfigs")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    if (!config) throw new Error("Delivery config not found");

    // If switching to direct_api, check for platform configs
    if (args.mode === "direct_api") {
      if (!config.doordashConfig && !config.ubereatsConfig && !config.grubhubConfig) {
        throw new Error(
          "At least one platform must be configured before switching to Direct API mode"
        );
      }
    }

    const oldMode = tenant!.deliveryMode;

    // Update tenant
    await ctx.db.patch(args.tenantId, {
      deliveryMode: args.mode,
      updatedAt: Date.now(),
    });

    // Update delivery config
    await ctx.db.patch(config._id, {
      mode: args.mode,
      lastModeSwitch: Date.now(),
      switchInitiatedBy: args.switchedBy,
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("auditLogs", {
      action: "update",
      entityType: "delivery_config",
      entityId: args.tenantId,
      userId: args.switchedBy,
      userType: "admin",
      tenantId: args.tenantId,
      oldValues: { mode: oldMode },
      newValues: { mode: args.mode },
      metadata: { action: "delivery_mode_switch" },
      createdAt: Date.now(),
    });

    return { oldMode, newMode: args.mode };
  },
});

export const updatePaymentSettings = mutation({
  args: {
    tenantId: v.id("tenants"),
    paymentProcessor: v.union(
      v.literal("stripe"),
      v.literal("square"),
      v.literal("none")
    ),
    stripeAccountId: v.optional(v.string()),
    stripeTerminalLocationId: v.optional(v.string()),
    squareAccessToken: v.optional(v.string()),
    squareRefreshToken: v.optional(v.string()),
    squareLocationId: v.optional(v.string()),
    squareMerchantId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden");
    }

    // Only owner and manager roles can modify payment settings
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can update payment settings");
    }

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    const oldValues = {
      paymentProcessor: tenant.paymentProcessor ?? "none",
      stripeAccountId: tenant.stripeAccountId,
      stripeTerminalLocationId: tenant.stripeTerminalLocationId,
      squareLocationId: tenant.squareLocationId,
      squareMerchantId: tenant.squareMerchantId,
    };

    const updates: Record<string, unknown> = {
      paymentProcessor: args.paymentProcessor,
      updatedAt: Date.now(),
    };

    // Only set Stripe-specific fields when processor is stripe
    if (args.paymentProcessor === "stripe") {
      if (args.stripeAccountId !== undefined) {
        updates.stripeAccountId = args.stripeAccountId;
      }
      if (args.stripeTerminalLocationId !== undefined) {
        updates.stripeTerminalLocationId = args.stripeTerminalLocationId;
      }
      // Clear Square fields when switching to Stripe
      updates.squareAccessToken = undefined;
      updates.squareRefreshToken = undefined;
      updates.squareLocationId = undefined;
      updates.squareMerchantId = undefined;
    } else if (args.paymentProcessor === "square") {
      if (args.squareAccessToken !== undefined) {
        updates.squareAccessToken = args.squareAccessToken;
      }
      if (args.squareRefreshToken !== undefined) {
        updates.squareRefreshToken = args.squareRefreshToken;
      }
      if (args.squareLocationId !== undefined) {
        updates.squareLocationId = args.squareLocationId;
      }
      if (args.squareMerchantId !== undefined) {
        updates.squareMerchantId = args.squareMerchantId;
      }
      // Clear Stripe fields when switching to Square
      updates.stripeAccountId = undefined;
      updates.stripeTerminalLocationId = undefined;
    } else {
      // "none" — clear all processor-specific fields
      updates.stripeAccountId = undefined;
      updates.stripeTerminalLocationId = undefined;
      updates.squareAccessToken = undefined;
      updates.squareRefreshToken = undefined;
      updates.squareLocationId = undefined;
      updates.squareMerchantId = undefined;
    }

    await ctx.db.patch(args.tenantId, updates);

    // Audit log — never log tokens, only non-sensitive identifiers
    await ctx.db.insert("auditLogs", {
      action: "update",
      entityType: "tenant",
      entityId: args.tenantId,
      userId: user._id,
      userType: "tenant_user",
      userEmail: user.email,
      tenantId: args.tenantId,
      oldValues,
      newValues: {
        paymentProcessor: args.paymentProcessor,
        stripeAccountId: args.stripeAccountId,
        stripeTerminalLocationId: args.stripeTerminalLocationId,
        squareLocationId: args.squareLocationId,
        squareMerchantId: args.squareMerchantId,
      },
      metadata: { action: "payment_settings_update" },
      createdAt: Date.now(),
    });
  },
});

export const updateDeliverySettings = mutation({
  args: {
    tenantId: v.id("tenants"),
    deliveryEnabled: v.optional(v.boolean()),
    deliveryFee: v.optional(v.number()),
    deliveryMinimum: v.optional(v.number()),
    deliveryRadius: v.optional(v.number()),
    deliveryZones: v.optional(
      v.array(
        v.object({
          name: v.string(),
          zipCodes: v.array(v.string()),
          fee: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden");
    }

    // Only owner and manager roles can modify delivery settings
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can update delivery settings");
    }

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    // Validate zone zip codes are non-empty strings
    if (args.deliveryZones) {
      for (const zone of args.deliveryZones) {
        if (!zone.name.trim()) {
          throw new Error("Delivery zone name cannot be empty");
        }
        if (zone.zipCodes.length === 0) {
          throw new Error(`Delivery zone "${zone.name}" must have at least one zip code`);
        }
        for (const zip of zone.zipCodes) {
          if (!/^\d{5}$/.test(zip)) {
            throw new Error(`Invalid zip code "${zip}" in zone "${zone.name}"`);
          }
        }
        if (zone.fee < 0) {
          throw new Error(`Delivery fee cannot be negative for zone "${zone.name}"`);
        }
      }
    }

    if (args.deliveryFee !== undefined && args.deliveryFee < 0) {
      throw new Error("Delivery fee cannot be negative");
    }
    if (args.deliveryMinimum !== undefined && args.deliveryMinimum < 0) {
      throw new Error("Delivery minimum cannot be negative");
    }
    if (args.deliveryRadius !== undefined && args.deliveryRadius < 0) {
      throw new Error("Delivery radius cannot be negative");
    }

    const oldValues = {
      deliveryEnabled: tenant.deliveryEnabled,
      deliveryFee: tenant.deliveryFee,
      deliveryMinimum: tenant.deliveryMinimum,
      deliveryRadius: tenant.deliveryRadius,
      deliveryZones: tenant.deliveryZones,
    };

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.deliveryEnabled !== undefined) updates.deliveryEnabled = args.deliveryEnabled;
    if (args.deliveryFee !== undefined) updates.deliveryFee = args.deliveryFee;
    if (args.deliveryMinimum !== undefined) updates.deliveryMinimum = args.deliveryMinimum;
    if (args.deliveryRadius !== undefined) updates.deliveryRadius = args.deliveryRadius;
    if (args.deliveryZones !== undefined) updates.deliveryZones = args.deliveryZones;

    await ctx.db.patch(args.tenantId, updates);

    // Audit log
    await ctx.db.insert("auditLogs", {
      action: "update",
      entityType: "tenant",
      entityId: args.tenantId,
      userId: user._id,
      userType: "tenant_user",
      userEmail: user.email,
      tenantId: args.tenantId,
      oldValues,
      newValues: updates,
      metadata: { action: "delivery_settings_update" },
      createdAt: Date.now(),
    });
  },
});

export const updateDoordashSettings = mutation({
  args: {
    tenantId: v.id("tenants"),
    doordashDriveEnabled: v.boolean(),
    doordashDeveloperId: v.optional(v.string()),
    doordashKeyId: v.optional(v.string()),
    doordashSigningSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden");
    }

    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can update DoorDash settings");
    }

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    // If enabling, require all three credential fields
    if (args.doordashDriveEnabled) {
      if (!args.doordashDeveloperId?.trim()) {
        throw new Error("Developer ID is required when enabling DoorDash Drive");
      }
      if (!args.doordashKeyId?.trim()) {
        throw new Error("Key ID is required when enabling DoorDash Drive");
      }
      if (!args.doordashSigningSecret?.trim()) {
        throw new Error("Signing Secret is required when enabling DoorDash Drive");
      }
    }

    const oldValues = {
      doordashDriveEnabled: tenant.doordashDriveEnabled,
      doordashDeveloperId: tenant.doordashDeveloperId,
      doordashKeyId: tenant.doordashKeyId,
    };

    const updates: Record<string, unknown> = {
      doordashDriveEnabled: args.doordashDriveEnabled,
      updatedAt: Date.now(),
    };

    if (args.doordashDeveloperId !== undefined) {
      updates.doordashDeveloperId = args.doordashDeveloperId;
    }
    if (args.doordashKeyId !== undefined) {
      updates.doordashKeyId = args.doordashKeyId;
    }
    if (args.doordashSigningSecret !== undefined) {
      updates.doordashSigningSecret = args.doordashSigningSecret;
    }

    // If disabling, clear the secrets
    if (!args.doordashDriveEnabled) {
      updates.doordashDeveloperId = undefined;
      updates.doordashKeyId = undefined;
      updates.doordashSigningSecret = undefined;
    }

    await ctx.db.patch(args.tenantId, updates);

    // Audit log — never log secrets
    await ctx.db.insert("auditLogs", {
      action: "update",
      entityType: "tenant",
      entityId: args.tenantId,
      userId: user._id,
      userType: "tenant_user",
      userEmail: user.email,
      tenantId: args.tenantId,
      oldValues,
      newValues: {
        doordashDriveEnabled: args.doordashDriveEnabled,
        doordashDeveloperId: args.doordashDeveloperId,
        doordashKeyId: args.doordashKeyId,
      },
      metadata: { action: "doordash_settings_update" },
      createdAt: Date.now(),
    });
  },
});

export const updateReservationSettings = mutation({
  args: {
    tenantId: v.id("tenants"),
    reservationsEnabled: v.optional(v.boolean()),
    reservationSlotMinutes: v.optional(v.number()),
    reservationMaxPartySize: v.optional(v.number()),
    reservationMaxDaysAhead: v.optional(v.number()),
    reservationDefaultDuration: v.optional(v.number()),
    reservationAutoConfirm: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden");
    }

    // Only owner and manager roles can modify reservation settings
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can update reservation settings");
    }

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    // Validate slot minutes if provided
    if (
      args.reservationSlotMinutes !== undefined &&
      args.reservationSlotMinutes !== 15 &&
      args.reservationSlotMinutes !== 30 &&
      args.reservationSlotMinutes !== 60
    ) {
      throw new Error("Reservation slot minutes must be 15, 30, or 60");
    }

    // Validate max party size
    if (
      args.reservationMaxPartySize !== undefined &&
      args.reservationMaxPartySize < 1
    ) {
      throw new Error("Max party size must be at least 1");
    }

    // Validate max days ahead
    if (
      args.reservationMaxDaysAhead !== undefined &&
      args.reservationMaxDaysAhead < 1
    ) {
      throw new Error("Max days ahead must be at least 1");
    }

    // Validate default duration
    if (
      args.reservationDefaultDuration !== undefined &&
      args.reservationDefaultDuration < 15
    ) {
      throw new Error("Default reservation duration must be at least 15 minutes");
    }

    const oldValues = {
      reservationsEnabled: tenant.reservationsEnabled,
      reservationSlotMinutes: tenant.reservationSlotMinutes,
      reservationMaxPartySize: tenant.reservationMaxPartySize,
      reservationMaxDaysAhead: tenant.reservationMaxDaysAhead,
      reservationDefaultDuration: tenant.reservationDefaultDuration,
      reservationAutoConfirm: tenant.reservationAutoConfirm,
    };

    const { tenantId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(tenantId, updates);

    // Audit log
    await ctx.db.insert("auditLogs", {
      action: "update",
      entityType: "tenant",
      entityId: args.tenantId,
      userId: user._id,
      userType: "tenant_user",
      userEmail: user.email,
      tenantId: args.tenantId,
      oldValues,
      newValues: updates,
      metadata: { action: "reservation_settings_update" },
      createdAt: Date.now(),
    });
  },
});

export const updateTipPoolingConfig = mutation({
  args: {
    tenantId: v.id("tenants"),
    tipPoolingEnabled: v.boolean(),
    tipPoolingMethod: v.union(
      v.literal("equal"),
      v.literal("hours"),
      v.literal("points")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden");
    }

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    await ctx.db.patch(args.tenantId, {
      tipPoolingEnabled: args.tipPoolingEnabled,
      tipPoolingMethod: args.tipPoolingMethod,
      updatedAt: Date.now(),
    });
  },
});

export const updateAccountingSettings = mutation({
  args: {
    tenantId: v.id("tenants"),
    accountingProvider: v.union(
      v.literal("quickbooks"),
      v.literal("xero"),
      v.literal("none")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden");
    }
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can update accounting settings");
    }

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    const oldProvider = tenant.accountingProvider ?? "none";
    const updates: Record<string, unknown> = {
      accountingProvider: args.accountingProvider,
      updatedAt: Date.now(),
    };

    // Clear credentials when switching to "none" or switching providers
    if (args.accountingProvider === "none" || args.accountingProvider !== oldProvider) {
      if (oldProvider === "quickbooks" || args.accountingProvider !== "quickbooks") {
        updates.quickbooksAccessToken = undefined;
        updates.quickbooksRefreshToken = undefined;
        updates.quickbooksRealmId = undefined;
        updates.quickbooksConnectedAt = undefined;
      }
      if (oldProvider === "xero" || args.accountingProvider !== "xero") {
        updates.xeroAccessToken = undefined;
        updates.xeroRefreshToken = undefined;
        updates.xeroTenantId = undefined;
        updates.xeroConnectedAt = undefined;
      }
    }

    await ctx.db.patch(args.tenantId, updates);

    // Audit log
    await ctx.db.insert("auditLogs", {
      action: "update",
      entityType: "tenant",
      entityId: args.tenantId,
      userId: user._id,
      userType: "tenant_user",
      userEmail: user.email,
      tenantId: args.tenantId,
      oldValues: { accountingProvider: oldProvider },
      newValues: { accountingProvider: args.accountingProvider },
      metadata: { action: "accounting_settings_update" },
      createdAt: Date.now(),
    });
  },
});

/**
 * Store or clear accounting provider OAuth credentials.
 * Called from OAuth callback routes — uses internal auth (Convex HTTP client).
 */
export const updateAccountingCredentials = mutation({
  args: {
    tenantId: v.id("tenants"),
    provider: v.union(
      v.literal("quickbooks"),
      v.literal("xero"),
      v.literal("none")
    ),
    quickbooksAccessToken: v.optional(v.string()),
    quickbooksRefreshToken: v.optional(v.string()),
    quickbooksRealmId: v.optional(v.string()),
    xeroAccessToken: v.optional(v.string()),
    xeroRefreshToken: v.optional(v.string()),
    xeroTenantId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // This mutation is called from OAuth callback routes.
    // Require tenant access to prevent unauthorized credential writes.
    const user = await requireTenantAccess(ctx);
    if (user.tenantId !== args.tenantId) {
      throw new Error("Forbidden");
    }
    if (user.role !== "owner" && user.role !== "manager") {
      throw new Error("Only owners and managers can update accounting credentials");
    }

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");

    const now = Date.now();
    const updates: Record<string, unknown> = {
      accountingProvider: args.provider,
      updatedAt: now,
    };

    if (args.provider === "quickbooks") {
      if (args.quickbooksAccessToken !== undefined) {
        updates.quickbooksAccessToken = args.quickbooksAccessToken;
      }
      if (args.quickbooksRefreshToken !== undefined) {
        updates.quickbooksRefreshToken = args.quickbooksRefreshToken;
      }
      if (args.quickbooksRealmId !== undefined) {
        updates.quickbooksRealmId = args.quickbooksRealmId;
      }
      updates.quickbooksConnectedAt = now;
      // Clear Xero fields
      updates.xeroAccessToken = undefined;
      updates.xeroRefreshToken = undefined;
      updates.xeroTenantId = undefined;
      updates.xeroConnectedAt = undefined;
    } else if (args.provider === "xero") {
      if (args.xeroAccessToken !== undefined) {
        updates.xeroAccessToken = args.xeroAccessToken;
      }
      if (args.xeroRefreshToken !== undefined) {
        updates.xeroRefreshToken = args.xeroRefreshToken;
      }
      if (args.xeroTenantId !== undefined) {
        updates.xeroTenantId = args.xeroTenantId;
      }
      updates.xeroConnectedAt = now;
      // Clear QuickBooks fields
      updates.quickbooksAccessToken = undefined;
      updates.quickbooksRefreshToken = undefined;
      updates.quickbooksRealmId = undefined;
      updates.quickbooksConnectedAt = undefined;
    } else {
      // "none" — clear all accounting credentials
      updates.quickbooksAccessToken = undefined;
      updates.quickbooksRefreshToken = undefined;
      updates.quickbooksRealmId = undefined;
      updates.quickbooksConnectedAt = undefined;
      updates.xeroAccessToken = undefined;
      updates.xeroRefreshToken = undefined;
      updates.xeroTenantId = undefined;
      updates.xeroConnectedAt = undefined;
    }

    await ctx.db.patch(args.tenantId, updates);
  },
});
