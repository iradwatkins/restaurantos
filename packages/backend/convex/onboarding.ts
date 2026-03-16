import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Onboard a new restaurant client with sample data.
 * Creates tenant, theme, delivery config, owner user, sample menu, and tables.
 *
 * Run via: npx convex run onboarding:onboardClient '{...}'
 */
export const onboardClient = mutation({
  args: {
    name: v.string(),
    subdomain: v.string(),
    ownerEmail: v.string(),
    ownerName: v.string(),
    ownerPasswordHash: v.string(),
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
    primaryColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    plan: v.optional(v.union(v.literal("starter"), v.literal("growth"), v.literal("pro"))),
    includeSampleMenu: v.optional(v.boolean()),
    tableCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check subdomain availability
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", args.subdomain))
      .first();

    if (existing) {
      throw new Error(`Subdomain "${args.subdomain}" is already taken`);
    }

    // 1. Create tenant
    const tenantId = await ctx.db.insert("tenants", {
      slug: args.subdomain,
      name: args.name,
      subdomain: args.subdomain,
      status: "active",
      primaryColor: args.primaryColor ?? "#E63946",
      accentColor: args.accentColor ?? "#457B9D",
      deliveryMode: "kitchenhub",
      timezone: "America/Chicago",
      currency: "USD",
      plan: args.plan ?? "growth",
      phone: args.phone,
      email: args.email ?? args.ownerEmail,
      address: args.address,
      features: { onlineOrdering: true },
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create theme
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
      createdAt: now,
    });

    // 3. Create delivery config
    await ctx.db.insert("deliveryConfigs", {
      tenantId,
      mode: "kitchenhub",
      createdAt: now,
      updatedAt: now,
    });

    // 4. Create owner user
    await ctx.db.insert("users", {
      tenantId,
      email: args.ownerEmail,
      passwordHash: args.ownerPasswordHash,
      name: args.ownerName,
      role: "owner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // 5. Create tables
    const tableCount = args.tableCount ?? 8;
    for (let i = 1; i <= tableCount; i++) {
      await ctx.db.insert("tables", {
        tenantId,
        name: `Table ${i}`,
        seats: i <= 4 ? 2 : 4,
        section: i <= 4 ? "Main" : "Patio",
        status: "open",
        posX: (i - 1) % 4 * 120 + 60,
        posY: Math.floor((i - 1) / 4) * 120 + 60,
        shape: i <= 4 ? "square" : "round",
        createdAt: now,
      });
    }

    // 6. Create sample menu (if requested)
    if (args.includeSampleMenu !== false) {
      const appetizers = await ctx.db.insert("menuCategories", {
        tenantId,
        name: "Appetizers",
        description: "Starters and small plates",
        sortOrder: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const entrees = await ctx.db.insert("menuCategories", {
        tenantId,
        name: "Entrees",
        description: "Main courses",
        sortOrder: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const drinks = await ctx.db.insert("menuCategories", {
        tenantId,
        name: "Drinks",
        description: "Beverages",
        sortOrder: 2,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const sampleItems = [
        { cat: appetizers, name: "Chips & Guacamole", price: 899, desc: "Fresh-made guacamole with tortilla chips", tags: ["vegetarian", "gluten-free"] },
        { cat: appetizers, name: "Wings (8pc)", price: 1299, desc: "Crispy wings with your choice of sauce", tags: [] },
        { cat: appetizers, name: "Caesar Salad", price: 999, desc: "Romaine, parmesan, croutons, caesar dressing", tags: ["vegetarian"] },
        { cat: entrees, name: "Grilled Chicken", price: 1599, desc: "Herb-marinated chicken with seasonal vegetables", tags: ["gluten-free"] },
        { cat: entrees, name: "Cheeseburger", price: 1399, desc: "Half-pound Angus beef with cheddar, lettuce, tomato", tags: [] },
        { cat: entrees, name: "Fish Tacos", price: 1499, desc: "Beer-battered cod with slaw and chipotle aioli", tags: [] },
        { cat: entrees, name: "Pasta Primavera", price: 1299, desc: "Penne with seasonal vegetables in garlic cream sauce", tags: ["vegetarian"] },
        { cat: drinks, name: "Soft Drink", price: 299, desc: "Coke, Diet Coke, Sprite, Dr Pepper", tags: [] },
        { cat: drinks, name: "Fresh Lemonade", price: 399, desc: "House-made lemonade", tags: ["vegan"] },
        { cat: drinks, name: "Iced Tea", price: 299, desc: "Sweet or unsweetened", tags: ["vegan"] },
      ];

      for (let i = 0; i < sampleItems.length; i++) {
        const item = sampleItems[i]!;
        await ctx.db.insert("menuItems", {
          tenantId,
          categoryId: item.cat,
          name: item.name,
          description: item.desc,
          price: item.price,
          dietaryTags: item.tags.length > 0 ? item.tags : undefined,
          isAvailable: true,
          is86d: false,
          sortOrder: i,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return {
      tenantId,
      subdomain: args.subdomain,
      portalUrl: `${args.subdomain}.restaurantos.app`,
      orderUrl: `${args.subdomain}.restaurantos.app/order`,
    };
  },
});
