'use client';

import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';

/**
 * Extract the subdomain from the current browser hostname.
 * e.g., "dk-soul-food.localhost:3006" -> "dk-soul-food"
 * e.g., "marias-kitchen.restaurants.irawatkins.com" -> "marias-kitchen"
 */
function getSubdomain(): string | null {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname;

  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    if (parts.length >= 2 && parts[0] !== 'localhost') {
      return parts[0]!;
    }
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0]!;
  }

  return null;
}

/**
 * Hook to get the current tenant based on the subdomain.
 * Use this instead of tenants.queries.list + tenants?.[0].
 */
export function useTenant() {
  const subdomain = typeof window !== 'undefined' ? getSubdomain() : null;

  const tenant = useQuery(
    api.tenants.queries.getBySubdomain,
    subdomain ? { subdomain } : 'skip'
  );

  return { tenant, tenantId: tenant?._id, subdomain };
}
