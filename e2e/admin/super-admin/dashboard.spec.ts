import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Super Admin — Dashboard', () => {
  test('Dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('main, [data-testid="dashboard"], .dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('Sidebar shows all navigation items (Dashboard, Tenants, Audit Logs, Settings)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator(
      'nav, [data-testid="sidebar"], [data-testid="nav"], aside, [role="navigation"]'
    ).first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Verify all expected nav items are present
    const expectedItems = ['Dashboard', 'Tenants', 'Audit Logs', 'Settings'];
    for (const item of expectedItems) {
      const navItem = sidebar.getByText(item, { exact: false }).first();
      await expect(navItem).toBeVisible({ timeout: 10000 });
    }
  });

  test('Dashboard shows stats or overview content', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Dashboard should display stats cards, overview metrics, or summary content
    const statsContent = page.locator(
      '[data-testid*="stat"], [data-testid*="card"], [data-testid*="metric"], [data-testid*="overview"], [class*="stat"], [class*="card"], [class*="metric"]'
    );
    const headings = page.locator('h1, h2, h3').first();

    const hasStats = await statsContent.first().isVisible({ timeout: 10000 }).catch(() => false);
    const hasHeadings = await headings.isVisible({ timeout: 10000 }).catch(() => false);

    expect(hasStats || hasHeadings).toBeTruthy();
  });
});
