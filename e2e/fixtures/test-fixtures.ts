import { test as base } from '@playwright/test';

// Extend base test with common fixtures
export const test = base.extend<{
  subdomain: string;
  portalURL: string;
  adminURL: string;
}>({
  subdomain: ['dk-soul-food', { option: true }],
  portalURL: ['http://dk-soul-food.localhost:3006', { option: true }],
  adminURL: ['http://localhost:3005', { option: true }],
});

export { expect } from '@playwright/test';
