import { z } from 'zod';
import { TENANT_ROLES, USER_STATUSES } from '../constants';

export const tenantUserSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).max(200),
  role: z.enum(TENANT_ROLES),
  status: z.enum(USER_STATUSES).default('active'),
});

export const createTenantUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(128),
  role: z.enum(TENANT_ROLES).default('server'),
  status: z.enum(USER_STATUSES).default('active').optional(),
});

export const updateTenantUserSchema = createTenantUserSchema
  .omit({ password: true })
  .partial()
  .extend({
    password: z.string().min(8).max(128).optional(),
  });
