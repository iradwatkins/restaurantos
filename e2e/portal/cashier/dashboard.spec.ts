import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Cashier — Dashboard', () => {
  test('Dashboard page loads for cashier role', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('main, [data-testid="dashboard"], .dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Sidebar navigation is visible', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    const sidebar = page.locator(
      'nav, [data-testid="sidebar"], [data-testid="nav"], aside, [role="navigation"]'
    ).first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    const navLinks = sidebar.locator('a, [role="link"], button');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test('Can navigate to orders via sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Find the orders link in the sidebar/nav
    const sidebar = page.locator(
      'nav, [data-testid="sidebar"], [data-testid="nav"], aside, [role="navigation"]'
    ).first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    const ordersLink = sidebar.locator('a:has-text("Orders"), a[href*="orders"]').first();
    await expect(ordersLink).toBeVisible({ timeout: 10000 });
    await ordersLink.click();

    await expect(page).toHaveURL(/\/orders/, { timeout: 10000 });
    await expect(page.locator('main, [data-testid="orders-page"], .orders')).toBeVisible({ timeout: 10000 });
  });
});
