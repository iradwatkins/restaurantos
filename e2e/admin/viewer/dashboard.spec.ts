import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Admin Viewer — Dashboard', () => {
  test('Dashboard page loads with viewer session', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard/);

    const heading = page.getByRole('heading', { name: /dashboard/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('Dashboard content area is visible', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10000 });

    // Verify stats grid or dashboard content renders (Convex-loaded)
    const statsArea = page.locator('text=Active Tenants').or(
      page.locator('text=Platform overview')
    );
    await expect(statsArea.first()).toBeVisible({ timeout: 10000 });
  });
});
