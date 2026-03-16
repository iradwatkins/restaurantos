import type { AdminRole, PermissionDomain, PermissionAction } from '@restaurantos/config';

type RolePermissions = Record<PermissionDomain, Record<PermissionAction, boolean>>;

const ROLE_PERMISSIONS: Record<AdminRole, RolePermissions> = {
  super_admin: {
    orders: { read: true, write: true, delete: true },
    menu: { read: true, write: true, delete: true },
    staff: { read: true, write: true, delete: true },
    analytics: { read: true, write: true, delete: true },
    settings: { read: true, write: true, delete: true },
    delivery: { read: true, write: true, delete: true },
    customers: { read: true, write: true, delete: true },
  },
  support: {
    orders: { read: true, write: true, delete: false },
    menu: { read: true, write: true, delete: false },
    staff: { read: true, write: true, delete: false },
    analytics: { read: true, write: false, delete: false },
    settings: { read: true, write: true, delete: false },
    delivery: { read: true, write: true, delete: false },
    customers: { read: true, write: true, delete: false },
  },
  viewer: {
    orders: { read: true, write: false, delete: false },
    menu: { read: true, write: false, delete: false },
    staff: { read: true, write: false, delete: false },
    analytics: { read: true, write: false, delete: false },
    settings: { read: true, write: false, delete: false },
    delivery: { read: true, write: false, delete: false },
    customers: { read: true, write: false, delete: false },
  },
};

export function hasPermission(
  role: string,
  domain: PermissionDomain,
  action: PermissionAction
): boolean {
  const permissions = ROLE_PERMISSIONS[role as AdminRole];
  if (!permissions) return false;
  return permissions[domain]?.[action] ?? false;
}

export function requirePermission(
  role: string,
  domain: PermissionDomain,
  action: PermissionAction
): void {
  if (!hasPermission(role, domain, action)) {
    throw new Error(`Insufficient permissions: ${domain}:${action}`);
  }
}
