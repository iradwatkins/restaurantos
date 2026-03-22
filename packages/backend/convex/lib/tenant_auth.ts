import { MutationCtx, QueryCtx } from "../_generated/server";
import { getCurrentUser } from "./auth";

/**
 * Require the current user is authenticated and belongs to a tenant.
 * Returns the user with their tenantId for downstream authorization checks.
 */
export async function requireTenantAccess(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user.tenantId) {
    throw new Error("Forbidden: user is not associated with a tenant");
  }
  return user;
}

/**
 * Assert that a document belongs to the current user's tenant.
 * Call after fetching any document that has a `tenantId` field.
 */
export function assertTenantOwnership(
  doc: { tenantId: string } | null,
  userTenantId: string
): asserts doc is NonNullable<typeof doc> {
  if (!doc) {
    throw new Error("Not found");
  }
  if (doc.tenantId !== userTenantId) {
    throw new Error("Forbidden");
  }
}
