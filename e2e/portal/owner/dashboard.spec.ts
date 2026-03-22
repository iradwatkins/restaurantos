import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Owner Dashboard', () => {
  test('page loads with dashboard content', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('main, [data-testid="dashboard"], [class*="dashboard"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('sidebar shows all navigation items', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('nav, [data-testid="sidebar"], [class*="sidebar"], aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    const expectedNavItems = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Orders', href: '/orders' },
      { label: /KDS|Kitchen/i, href: '/kds' },
      { label: 'Menu', href: '/menu' },
      { label: 'Events', href: '/events-mgmt' },
      { label: 'Catering', href: '/catering-mgmt' },
      { label: 'Reports', href: '/reports' },
      { label: 'Settings', href: '/settings' },
    ];

    for (const item of expectedNavItems) {
      const link = sidebar.locator(`a[href="${item.href}"]`);
      await expect(link).toBeVisible({ timeout: 10000 });
    }
  });

  test('restaurant name "D & K Soul Food" is visible', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const restaurantName = page.getByText(/D\s*&\s*K\s+Soul\s+Food/i).first();
    await expect(restaurantName).toBeVisible({ timeout: 10000 });
  });
});
