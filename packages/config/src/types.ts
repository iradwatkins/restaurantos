import type {
  TenantStatus,
  DeliveryMode,
  Plan,
  AdminRole,
  TenantRole,
  UserStatus,
  PermissionDomain,
  PermissionAction,
} from './constants';

export interface TenantAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface TenantFeatures {
  onlineOrdering?: boolean;
  catering?: boolean;
  loyalty?: boolean;
  marketing?: boolean;
  reservations?: boolean;
  analytics?: boolean;
}

export type Permissions = Partial<
  Record<PermissionDomain, Partial<Record<PermissionAction, boolean>>>
>;

export interface TenantBranding {
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  fontFamily: string | null;
}

export interface CreateTenantInput {
  name: string;
  subdomain: string;
  status?: TenantStatus;
  branding?: TenantBranding;
  deliveryMode?: DeliveryMode;
  plan?: Plan;
  timezone?: string;
  currency?: string;
  phone?: string;
  email?: string;
  address?: TenantAddress;
  features?: TenantFeatures;
  ownerEmail: string;
  ownerName: string;
  ownerPassword: string;
}

export interface CreateAdminUserInput {
  email: string;
  name: string;
  password: string;
  role: AdminRole;
}

export interface CreateTenantUserInput {
  tenantId: string;
  email: string;
  name: string;
  password: string;
  role: TenantRole;
  status?: UserStatus;
}
