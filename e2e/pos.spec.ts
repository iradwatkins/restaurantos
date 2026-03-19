import { test, expect } from './fixtures/test-fixtures';

test.describe('POS Terminal', () => {
  // POS is behind auth, so these tests verify the redirect works
  test('redirects unauthenticated user from POS page', async ({ page }) => {
    await page.goto('/orders');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects unauthenticated user from serve page', async ({ page }) => {
    await page.goto('/serve');
    await expect(page).toHaveURL(/\/login/);
  });
});
