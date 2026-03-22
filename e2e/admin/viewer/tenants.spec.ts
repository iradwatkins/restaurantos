import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Admin Viewer — Tenants', () => {
  test('Tenant list page loads (/tenants)', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/tenants/);

    const heading = page.getByRole('heading', { name: /tenants/i });
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test('Can view tenant list with entries', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle');

    // Wait for Convex-loaded table rows to appear
    const tableBody = page.locator('tbody');
    await expect(tableBody).toBeVisible({ timeout: 15000 });

    // Wait for actual tenant data to load from Convex
    const tenantLinks = tableBody.locator('a[href*="/tenants/"]');
    await expect(tenantLinks.first()).toBeVisible({ timeout: 30000 });
  });

  test('Can view tenant detail page', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle');

    const tenantLink = page.locator('tbody a[href*="/tenants/"]').first();
    await expect(tenantLink).toBeVisible({ timeout: 30000 });

    await tenantLink.click();
    await page.waitForLoadState('networkidle');

    // Should navigate to tenant detail
    await expect(page).toHaveURL(/\/tenants\/[a-zA-Z0-9_]+/, { timeout: 15000 });

    // Overview card should be visible on the detail page
    const overviewHeading = page.getByRole('heading', { name: /overview/i }).or(
      page.getByText('Overview')
    );
    await expect(overviewHeading.first()).toBeVisible({ timeout: 15000 });
  });

  test('Audit logs page is accessible (/audit-logs)', async ({ page }) => {
    await page.goto('/audit-logs');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/audit-logs/);

    const heading = page.getByRole('heading', { name: /audit logs/i });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // The "Recent Activity" card should be visible
    const activityCard = page.getByText('Recent Activity');
    await expect(activityCard).toBeVisible({ timeout: 15000 });
  });
});
