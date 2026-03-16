import { z } from 'zod';
import { TENANT_STATUSES, DELIVERY_MODES, PLANS } from '../constants';

const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

export const tenantAddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().min(1).default('US'),
});

export const tenantFeaturesSchema = z.object({
  onlineOrdering: z.boolean().optional(),
  catering: z.boolean().optional(),
  loyalty: z.boolean().optional(),
  marketing: z.boolean().optional(),
  reservations: z.boolean().optional(),
  analytics: z.boolean().optional(),
});

export const tenantSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  subdomain: z.string().min(1).max(100).regex(subdomainRegex, {
    message: 'Subdomain must be lowercase alphanumeric with optional hyphens',
  }),
  customDomain: z.string().max(200).nullable().optional(),
  status: z.enum(TENANT_STATUSES).default('active'),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(hexColorRegex).nullable().optional(),
  accentColor: z.string().regex(hexColorRegex).nullable().optional(),
  fontFamily: z.string().max(100).nullable().optional(),
  deliveryMode: z.enum(DELIVERY_MODES).default('kitchenhub'),
  timezone: z.string().default('America/New_York'),
  currency: z.string().length(3).default('USD'),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: tenantAddressSchema.nullable().optional(),
  features: tenantFeaturesSchema.default({}),
  plan: z.enum(PLANS).default('growth'),
  stripeCustomerId: z.string().nullable().optional(),
});

export const createTenantSchema = z.object({
  name: z.string().min(1).max(200),
  subdomain: z.string().min(1).max(100).regex(subdomainRegex, {
    message: 'Subdomain must be lowercase alphanumeric with optional hyphens',
  }),
  status: z.enum(TENANT_STATUSES).default('active').optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(hexColorRegex).nullable().optional(),
  accentColor: z.string().regex(hexColorRegex).nullable().optional(),
  fontFamily: z.string().max(100).nullable().optional(),
  deliveryMode: z.enum(DELIVERY_MODES).default('kitchenhub').optional(),
  timezone: z.string().default('America/New_York').optional(),
  currency: z.string().length(3).default('USD').optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: tenantAddressSchema.nullable().optional(),
  features: tenantFeaturesSchema.default({}).optional(),
  plan: z.enum(PLANS).default('growth').optional(),
  ownerEmail: z.string().email(),
  ownerName: z.string().min(1).max(200),
  ownerPassword: z.string().min(8).max(128),
});

export const updateTenantSchema = createTenantSchema
  .omit({ ownerEmail: true, ownerName: true, ownerPassword: true })
  .partial();
