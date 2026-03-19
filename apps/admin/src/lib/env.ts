import { z } from 'zod';

const envSchema = z.object({
  // Required: Convex backend URL
  NEXT_PUBLIC_CONVEX_URL: z.string().url('NEXT_PUBLIC_CONVEX_URL must be a valid URL'),

  // Optional: Auth
  JWT_SECRET: z.string().optional(),
  AUTH_SECRET: z.string().optional(),

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
    JWT_SECRET: process.env.JWT_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    LOG_LEVEL: process.env.LOG_LEVEL,
  });
}

export const env = validateEnv();
