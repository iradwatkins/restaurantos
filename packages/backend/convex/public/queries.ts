import { query } from "../_generated/server";
import { v } from "convex/values";
import { resolveStorageUrl } from "../lib/storage";

/**
 * Public queries for website, online ordering, and order tracking.
 */

// ==================== Events & Daily Specials (Public) ====================

export const getPublicEvents = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const activeEvents = events.filter((e) => e.isActive);

    return await Promise.all(
      activeEvents.map(async (event) => {
        const tiers = await ctx.db
          .query("eventPricingTiers")
          .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
          .collect();

        return {
          ...event,
          pricingTiers: tiers.sort((a, b) => a.sortOrder - b.sortOrder),
        };
      })
    );
  },
});

export const getTodaySpecial = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const today = new Date().getDay();
    const specials = await ctx.db
      .query("dailySpecials")
      .withIndex("by_tenantId_dayOfWeek", (q) =>
        q.eq("tenantId", args.tenantId).eq("dayOfWeek", today)
      )
      .collect();

    return specials.filter((s) => s.isActive)[0] ?? null;
  },
});

export const getDailySpecials = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const specials = await ctx.db
      .query("dailySpecials")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return specials
      .filter((s) => s.isActive)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  },
});

// ==================== Website Queries ====================

export const getTenantWebsite = query({
  args: { subdomain: v.string() },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", args.subdomain))
      .first();

    if (!tenant || tenant.status !== "active") return null;

    // Get hero image URL (resolve relative paths from self-hosted Convex)
    let heroImageUrl: string | null = null;
    if (tenant.heroImageStorageId) {
      const rawUrl = await ctx.storage.getUrl(tenant.heroImageStorageId);
      heroImageUrl = resolveStorageUrl(rawUrl);
    }

    // Get logo URL
    let logoUrl = tenant.logoUrl ?? null;

    // Get theme
    const theme = await ctx.db
      .query("tenantThemes")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenant._id))
      .first();

    return {
      _id: tenant._id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      tagline: tenant.tagline,
      aboutText: tenant.aboutText,
      phone: tenant.phone,
      email: tenant.email,
      address: tenant.address,
      businessHours: tenant.businessHours,
      primaryColor: tenant.primaryColor,
      accentColor: tenant.accentColor,
      logoUrl,
      heroImageUrl,
      featuredItemIds: tenant.featuredItemIds,
      socialLinks: tenant.socialLinks,
      googleMapsEmbedUrl: tenant.googleMapsEmbedUrl,
      websiteEnabled: tenant.websiteEnabled,
      features: tenant.features,
      theme,
      // Configurable website content
      heroHeading: tenant.heroHeading,
      heroSubheading: tenant.heroSubheading,
      deliveryMessage: tenant.deliveryMessage,
      deliveryPartners: tenant.deliveryPartners,
      footerTagline: tenant.footerTagline,
    };
  },
});

export const getFullMenu = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("menuCategories")
      .withIndex("by_tenantId_sortOrder", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const activeCategories = categories.filter((c) => c.isActive !== false);

    const items = await ctx.db
      .query("menuItems")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Include all items for the menu showcase (including 86'd with flag)
    const menu = activeCategories.map((cat) => ({
      ...cat,
      items: items
        .filter((i) => i.categoryId === cat._id && i.isAvailable)
        .map((i) => ({
          ...i,
          imageUrl: i.imageUrl ?? null,
        })),
    }));

    return menu.filter((cat) => cat.items.length > 0);
  },
});

export const getFeaturedItems = query({
  args: { tenantId: v.id("tenants"), itemIds: v.array(v.id("menuItems")) },
  handler: async (ctx, args) => {
    const items = [];
    for (const id of args.itemIds) {
      const item = await ctx.db.get(id);
      if (item && item.isAvailable && !item.is86d) {
        items.push(item);
      }
    }
    return items;
  },
});

/**
 * Public queries for the online ordering page.
 * No auth required — these are customer-facing.
 */

export const getTenantBySubdomain = query({
  args: { subdomain: v.string() },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", args.subdomain))
      .first();

    if (!tenant || tenant.status !== "active") return null;

    // Return only public-safe fields
    return {
      _id: tenant._id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      primaryColor: tenant.primaryColor,
      accentColor: tenant.accentColor,
      phone: tenant.phone,
      email: tenant.email,
      address: tenant.address,
      timezone: tenant.timezone,
      taxRate: tenant.taxRate ?? 0.0875,
      businessHours: tenant.businessHours,
      onlineOrderingSettings: tenant.onlineOrderingSettings,
      tagline: tenant.tagline,
      aboutText: tenant.aboutText,
      features: tenant.features,
    };
  },
});

const ALCOHOL_TYPES = ["beer", "wine", "spirits"] as const;

export const getMenu = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("menuCategories")
      .withIndex("by_tenantId_sortOrder", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const activeCategories = categories.filter((c) => c.isActive !== false);

    const items = await ctx.db
      .query("menuItems")
      .withIndex("by_tenantId_available", (q) =>
        q.eq("tenantId", args.tenantId).eq("isAvailable", true)
      )
      .collect();

    const now = Date.now();

    // Check if tenant has any alcohol items (for UX banner)
    const hasAlcoholItems = items.some((i) => {
      const itemType = i.type ?? "food";
      return (ALCOHOL_TYPES as readonly string[]).includes(itemType);
    });

    // Group items by category, filtering out:
    // 1. 86'd items
    // 2. Alcohol items (no alcohol on online ordering)
    // 3. LTO items outside their availability window
    const menu = activeCategories.map((cat) => ({
      ...cat,
      items: items.filter((i) => {
        if (i.categoryId !== cat._id) return false;
        if (i.is86d) return false;
        // Filter out alcohol — online ordering cannot include alcohol
        const itemType = i.type ?? "food";
        if ((ALCOHOL_TYPES as readonly string[]).includes(itemType)) return false;
        // Filter out LTO items outside their window
        if (i.availableFrom && now < i.availableFrom) return false;
        if (i.availableTo && now > i.availableTo) return false;
        return true;
      }),
    }));

    // Only return categories that have items
    return {
      categories: menu.filter((cat) => cat.items.length > 0),
      hasAlcoholItems,
    };
  },
});

export const getOrderStatus = query({
  args: {
    tenantId: v.id("tenants"),
    orderNumber: v.number(),
    customerPhone: v.string(),
  },
  handler: async (ctx, args) => {
    // Find order by tenant + order number
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // First check if order exists by number, then verify phone
    const orderByNumber = orders.find((o) => o.orderNumber === args.orderNumber);
    if (!orderByNumber) {
      return { error: "order_not_found" as const };
    }
    if (orderByNumber.customerPhone !== args.customerPhone) {
      return { error: "phone_mismatch" as const };
    }

    const order = orderByNumber;

    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        modifiers: i.modifiers,
      })),
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      scheduledPickupTime: order.scheduledPickupTime,
      estimatedReadyAt: order.estimatedReadyAt,
      createdAt: order.createdAt,
      completedAt: order.completedAt,
      paymentStatus: order.paymentStatus,
    };
  },
});

export const getOrderById = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        modifiers: i.modifiers,
      })),
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      scheduledPickupTime: order.scheduledPickupTime,
      estimatedReadyAt: order.estimatedReadyAt,
      createdAt: order.createdAt,
      completedAt: order.completedAt,
      paymentStatus: order.paymentStatus,
    };
  },
});

export const getCateringMenu = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("cateringCategories")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const activeCategories = categories.filter((c) => c.isActive);

    const items = await ctx.db
      .query("cateringMenuItems")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const menu = activeCategories.map((cat) => ({
      ...cat,
      items: items.filter((i) => i.categoryId === cat._id && i.isAvailable),
    }));

    return menu.filter((cat) => cat.items.length > 0);
  },
});

export const getModifiersForItem = query({
  args: { tenantId: v.id("tenants"), menuItemId: v.id("menuItems") },
  handler: async (ctx, args) => {
    const groups = await ctx.db
      .query("modifierGroups")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter groups that apply to this item
    const applicable = groups.filter((g) =>
      g.menuItemIds.includes(args.menuItemId)
    );

    // Get options for each group
    const result = await Promise.all(
      applicable.map(async (group) => {
        const options = await ctx.db
          .query("modifierOptions")
          .withIndex("by_groupId", (q) => q.eq("groupId", group._id))
          .collect();

        return {
          ...group,
          options: options.filter((o) => o.isAvailable !== false),
        };
      })
    );

    return result;
  },
});
