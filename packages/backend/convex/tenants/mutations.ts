import { mutation } from "../_generated/server";
import { v } from "convex/values";

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

    const oldMode = tenant.deliveryMode;

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
