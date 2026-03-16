import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Seed the database with a super admin user and a demo tenant.
 * Run via: npx convex run seed:seedDatabase
 */
export const seedDatabase = mutation({
  args: {
    adminPasswordHash: v.string(),
    ownerPasswordHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if admin already exists
    const existingAdmin = await ctx.db
      .query("adminUsers")
      .withIndex("by_email", (q) => q.eq("email", "admin@restaurantos.com"))
      .first();

    if (!existingAdmin) {
      await ctx.db.insert("adminUsers", {
        email: "admin@restaurantos.com",
        passwordHash: args.adminPasswordHash,
        name: "Super Admin",
        role: "super_admin",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log("Created super admin: admin@restaurantos.com");
    } else {
      console.log("Super admin already exists");
    }

    // Check if demo tenant exists
    const existingTenant = await ctx.db
      .query("tenants")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", "marias-kitchen"))
      .first();

    if (!existingTenant) {
      const tenantId = await ctx.db.insert("tenants", {
        slug: "marias-kitchen",
        name: "Maria's Kitchen",
        subdomain: "marias-kitchen",
        status: "active",
        primaryColor: "#E63946",
        accentColor: "#457B9D",
        deliveryMode: "kitchenhub",
        timezone: "America/Chicago",
        plan: "growth",
        phone: "(312) 555-0100",
        email: "maria@mariaskitchen.com",
        address: {
          street: "123 Main Street",
          city: "Chicago",
          state: "IL",
          zip: "60601",
          country: "US",
        },
        features: { onlineOrdering: true },
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
        mode: "kitchenhub",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create owner user
      await ctx.db.insert("users", {
        tenantId,
        email: "maria@mariaskitchen.com",
        passwordHash: args.ownerPasswordHash,
        name: "Maria Rodriguez",
        role: "owner",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      console.log("Created demo tenant: Maria's Kitchen");
    } else {
      console.log("Demo tenant already exists");
    }
  },
});
