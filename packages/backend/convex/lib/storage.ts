/**
 * Resolves Convex storage URLs that may be returned as relative paths
 * in self-hosted Convex deployments.
 */
export function resolveStorageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  // Self-hosted Convex returns relative paths like /api/storage/...
  // Prepend the Convex URL to make them absolute
  const base = process.env.CONVEX_CLOUD_URL || process.env.CONVEX_URL || "";
  return base ? `${base}${url}` : url;
}
