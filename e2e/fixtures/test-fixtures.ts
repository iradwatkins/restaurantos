import { test as base } from '@playwright/test';

// Extend base test with common fixtures
export const test = base.extend<{
  subdomain: string;
}>({
  subdomain: ['dk-soul-food', { option: true }],
});

export { expect } from '@playwright/test';
