import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Server — Dashboard', () => {
  test('Dashboard page loads for server role', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should land on dashboard or be redirected to the server's default page
    await expect(page.locator('main, [data-testid="dashboard"], .dashboard')).toBeVisible({ timeout: 10000 });

    // Verify the page has meaningful content (not a blank shell)
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Sidebar navigation is visible', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Sidebar or navigation should be present
    const sidebar = page.locator(
      'nav, [data-testid="sidebar"], [data-testid="nav"], aside, [role="navigation"]'
    ).first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Should contain navigation links
    const navLinks = sidebar.locator('a, [role="link"], button');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);
  });
});
