import { z } from 'zod';
import { DELIVERY_MODES } from '../constants';

export const platformConfigSchema = z.object({
  storeId: z.string().optional(),
  apiKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  enabled: z.boolean().default(false),
});

export const deliveryConfigSchema = z.object({
  tenantId: z.string().min(1),
  mode: z.enum(DELIVERY_MODES).default('kitchenhub'),
  khStoreId: z.string().nullable().optional(),
  khApiKey: z.string().nullable().optional(),
  khWebhookSecret: z.string().nullable().optional(),
  doordashConfig: platformConfigSchema.nullable().optional(),
  ubereatsConfig: platformConfigSchema.nullable().optional(),
  grubhubConfig: platformConfigSchema.nullable().optional(),
});

export const updateDeliveryConfigSchema = deliveryConfigSchema.partial().omit({ tenantId: true });
