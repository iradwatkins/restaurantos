import { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Get the current authenticated admin user from context.
 * Throws if not authenticated or not found.
 */
export async function getCurrentAdminUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  let email: string | undefined;

  if (identity.email && typeof identity.email === "string") {
    email = identity.email;
  }

  if (!email && identity.tokenIdentifier) {
    const parts = identity.tokenIdentifier.split("|");
    const last = parts[parts.length - 1];
    if (last && last.includes("@")) {
      email = last;
    }
  }

  if (!email && identity.subject) {
    const match = identity.subject.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (match) {
      email = match[0];
    }
  }

  if (!email) {
    throw new Error("No email found in auth token");
  }

  const user = await ctx.db
    .query("adminUsers")
    .withIndex("by_email", (q) => q.eq("email", email as string))
    .first();

  if (!user) {
    throw new Error("Admin user not found");
  }

  return user;
}

/**
 * Get the current authenticated tenant user from context.
 * Throws if not authenticated or not found.
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  let email: string | undefined;

  if (identity.email && typeof identity.email === "string") {
    email = identity.email;
  }

  if (!email && identity.tokenIdentifier) {
    const parts = identity.tokenIdentifier.split("|");
    const last = parts[parts.length - 1];
    if (last && last.includes("@")) {
      email = last;
    }
  }

  if (!email && identity.subject) {
    const match = identity.subject.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (match) {
      email = match[0];
    }
  }

  if (!email) {
    throw new Error("No email found in auth token");
  }

  let user = null;

  // Try tenant-scoped lookup first when tenantId is available
  const tenantId = (identity as any).tenantId;
  if (tenantId) {
    user = await ctx.db
      .query("users")
      .withIndex("by_tenantId_email", (q) =>
        q.eq("tenantId", tenantId).eq("email", email as string)
      )
      .first();
  }

  // Fall back to email-only lookup
  if (!user) {
    user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email as string))
      .first();
  }

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

/**
 * Get user or null (for optional auth contexts).
 */
export async function getCurrentUserOrNull(ctx: QueryCtx | MutationCtx) {
  try {
    return await getCurrentUser(ctx);
  } catch {
    return null;
  }
}

/**
 * Require admin user has super_admin role.
 */
export async function requireSuperAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentAdminUser(ctx);
  if (user.role !== "super_admin") {
    throw new Error("Super admin access required");
  }
  return user;
}
