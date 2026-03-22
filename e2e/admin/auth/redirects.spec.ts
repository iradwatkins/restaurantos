import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Admin Auth — Unauthenticated Redirects', () => {
  test('/dashboard redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/login/);
  });

  test('/tenants redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/login/);
  });

  test('/audit-logs redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/audit-logs');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/login/);
  });

  test('/settings redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/login/);
  });
});
