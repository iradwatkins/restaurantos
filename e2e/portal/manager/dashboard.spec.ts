import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Manager Dashboard', () => {
  test('dashboard page loads for manager role', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const dashboardContent = page.locator('main, [data-testid="dashboard"], [class*="dashboard"]').first();
    await expect(dashboardContent).toBeVisible({ timeout: 10000 });
  });

  test('sidebar navigation is visible with expected items', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('nav, [data-testid="sidebar"], [class*="sidebar"], aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Verify key navigation links are present
    const navLinks = [
      { href: '/dashboard' },
      { href: '/orders' },
      { href: '/kds' },
      { href: '/menu' },
      { href: '/settings' },
    ];

    for (const link of navLinks) {
      await expect(sidebar.locator(`a[href="${link.href}"]`)).toBeVisible({ timeout: 10000 });
    }
  });
});
