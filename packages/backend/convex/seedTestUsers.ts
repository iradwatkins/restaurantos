import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Seed test users for E2E tests. Idempotent — skips users that already exist.
 *
 * Portal users are scoped to the dk-soul-food tenant.
 * Admin users are global (adminUsers table).
 *
 * Run via: npx convex run seedTestUsers:seedTestUsers '{"passwordHash":"$2a$10$..."}'
 */
export const seedTestUsers = mutation({
  args: {
    passwordHash: v.string(), // bcrypt hash of "Test1234!"
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find dk-soul-food tenant
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", "dk-soul-food"))
      .first();

    if (!tenant) {
      throw new Error(
        "dk-soul-food tenant not found. Run seedDKSoulFood first."
      );
    }

    // --- Portal users (scoped to dk-soul-food) ---
    const portalUsers = [
      {
        email: "manager@dksoulfood.com",
        name: "DK Manager",
        role: "manager" as const,
      },
      {
        email: "server@dksoulfood.com",
        name: "DK Server",
        role: "server" as const,
      },
      {
        email: "cashier@dksoulfood.com",
        name: "DK Cashier",
        role: "cashier" as const,
      },
    ];

    for (const user of portalUsers) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_tenantId_email", (q) =>
          q.eq("tenantId", tenant._id).eq("email", user.email)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("users", {
          tenantId: tenant._id,
          email: user.email,
          passwordHash: args.passwordHash,
          name: user.name,
          role: user.role,
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
        console.log(`Created portal user: ${user.email} (${user.role})`);
      } else {
        console.log(`Portal user already exists: ${user.email}`);
      }
    }

    // --- Admin users (global) ---
    const adminUsers = [
      {
        email: "support@restaurantos.com",
        name: "Support Agent",
        role: "support" as const,
      },
      {
        email: "viewer@restaurantos.com",
        name: "Viewer User",
        role: "viewer" as const,
      },
    ];

    for (const user of adminUsers) {
      const existing = await ctx.db
        .query("adminUsers")
        .withIndex("by_email", (q) => q.eq("email", user.email))
        .first();

      if (!existing) {
        await ctx.db.insert("adminUsers", {
          email: user.email,
          passwordHash: args.passwordHash,
          name: user.name,
          role: user.role,
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
        console.log(`Created admin user: ${user.email} (${user.role})`);
      } else {
        console.log(`Admin user already exists: ${user.email}`);
      }
    }

    // --- Ensure existing users have the test password ---
    // Owner (dk@dksoulfood.com) may have been seeded with a different hash
    const owner = await ctx.db
      .query("users")
      .withIndex("by_tenantId_email", (q) =>
        q.eq("tenantId", tenant._id).eq("email", "dk@dksoulfood.com")
      )
      .first();
    if (owner && owner.passwordHash !== args.passwordHash) {
      await ctx.db.patch(owner._id, { passwordHash: args.passwordHash });
      console.log("Updated owner password hash: dk@dksoulfood.com");
    }

    // Super admin (admin@restaurantos.com) may also have a different hash
    const superAdmin = await ctx.db
      .query("adminUsers")
      .withIndex("by_email", (q) => q.eq("email", "admin@restaurantos.com"))
      .first();
    if (superAdmin && superAdmin.passwordHash !== args.passwordHash) {
      await ctx.db.patch(superAdmin._id, { passwordHash: args.passwordHash });
      console.log("Updated super admin password hash: admin@restaurantos.com");
    }

    return { success: true, tenantId: tenant._id };
  },
});
