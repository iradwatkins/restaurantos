import { z } from 'zod';
import { ADMIN_ROLES } from '../constants';

export const adminUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(200),
  role: z.enum(ADMIN_ROLES),
  status: z.string().default('active'),
});

export const createAdminUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(128),
  role: z.enum(ADMIN_ROLES).default('support'),
});
