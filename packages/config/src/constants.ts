export const TENANT_STATUSES = ['active', 'suspended', 'trial', 'churned'] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const DELIVERY_MODES = ['kitchenhub', 'direct_api'] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

export const PLANS = ['starter', 'growth', 'pro'] as const;
export type Plan = (typeof PLANS)[number];

export const ADMIN_ROLES = ['super_admin', 'support', 'viewer'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const TENANT_ROLES = ['owner', 'manager', 'server', 'cashier'] as const;
export type TenantRole = (typeof TENANT_ROLES)[number];

export const USER_STATUSES = ['active', 'inactive', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const ORDER_SOURCES = [
  'dine_in',
  'online',
  'doordash',
  'ubereats',
  'grubhub',
] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export const DELIVERY_PLATFORMS = ['doordash', 'ubereats', 'grubhub'] as const;
export type DeliveryPlatform = (typeof DELIVERY_PLATFORMS)[number];

export const PERMISSION_DOMAINS = [
  'orders',
  'menu',
  'staff',
  'analytics',
  'settings',
  'delivery',
  'customers',
] as const;
export type PermissionDomain = (typeof PERMISSION_DOMAINS)[number];

export const PERMISSION_ACTIONS = ['read', 'write', 'delete'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
