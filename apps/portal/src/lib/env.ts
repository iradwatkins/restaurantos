import { z } from 'zod';

const envSchema = z.object({
  // Required: Convex backend URL
  NEXT_PUBLIC_CONVEX_URL: z.string().url('NEXT_PUBLIC_CONVEX_URL must be a valid URL'),

  // Optional: Stripe keys (required in production but not during dev/build)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Optional: Notification services
  RESEND_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Optional: Auth
  JWT_SECRET: z.string().optional(),
  AUTH_SECRET: z.string().optional(),

  // Optional: Integrations
  KITCHENHUB_WEBHOOK_SECRET: z.string().optional(),
  DOORDASH_WEBHOOK_SECRET: z.string().optional(),

  // Optional: Logging
  LOG_LEVEL: z.string().optional(),
});

/**
 * Validate environment variables at runtime (server-side only).
 * Skipped during build to avoid breaking static generation.
 */
function validateEnv() {
  // Skip validation during build phase (next build sets this)
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return envSchema.partial().parse({});
  }

  return envSchema.parse({
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    JWT_SECRET: process.env.JWT_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    KITCHENHUB_WEBHOOK_SECRET: process.env.KITCHENHUB_WEBHOOK_SECRET,
    DOORDASH_WEBHOOK_SECRET: process.env.DOORDASH_WEBHOOK_SECRET,
    LOG_LEVEL: process.env.LOG_LEVEL,
  });
}

export const env = validateEnv();
