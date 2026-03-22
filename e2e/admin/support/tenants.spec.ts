import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Admin Support — Tenants', () => {
  test('Tenant list page loads (/tenants)', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/tenants/);

    const heading = page.getByRole('heading', { name: /tenants/i });
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test('Can see tenant list with entries', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle');

    // Wait for Convex-loaded table to appear
    const tableBody = page.locator('tbody');
    await expect(tableBody).toBeVisible({ timeout: 15000 });

    // Wait for actual tenant data to load from Convex (links inside table rows)
    const tenantLinks = tableBody.locator('a[href*="/tenants/"]');
    await expect(tenantLinks.first()).toBeVisible({ timeout: 30000 });
  });

  test('Can view tenant detail (click on a tenant)', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle');

    // Wait for tenant data to load from Convex
    const tenantLink = page.locator('tbody a[href*="/tenants/"]').first();
    await expect(tenantLink).toBeVisible({ timeout: 30000 });

    await tenantLink.click();
    await page.waitForLoadState('networkidle');

    // Should navigate to a tenant detail page
    await expect(page).toHaveURL(/\/tenants\/[a-zA-Z0-9_]+/, { timeout: 15000 });
  });

  test('Tenant detail shows tenant information', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle');

    const tenantLink = page.locator('tbody a[href*="/tenants/"]').first();
    await expect(tenantLink).toBeVisible({ timeout: 30000 });

    await tenantLink.click();
    await page.waitForLoadState('networkidle');

    // Tenant detail page should show the Overview card (CardTitle renders as div, not heading)
    const overviewText = page.locator('text=Overview').first();
    await expect(overviewText).toBeVisible({ timeout: 15000 });

    // Status label should be present (inside a span.text-muted-foreground)
    const statusLabel = page.locator('span:has-text("Status")').first();
    await expect(statusLabel).toBeVisible({ timeout: 15000 });

    // Plan label should be present
    const planLabel = page.locator('span:has-text("Plan")').first();
    await expect(planLabel).toBeVisible({ timeout: 15000 });
  });

  test('Can view tenant users list', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle');

    const tenantLink = page.locator('tbody a[href*="/tenants/"]').first();
    await expect(tenantLink).toBeVisible({ timeout: 30000 });

    await tenantLink.click();
    await page.waitForLoadState('networkidle');

    // Click the "Manage" button next to Staff section to go to users page
    const manageButton = page.getByRole('link', { name: /manage/i });
    await expect(manageButton).toBeVisible({ timeout: 15000 });
    await manageButton.click();
    await page.waitForLoadState('networkidle');

    // Should be on the users page
    await expect(page).toHaveURL(/\/tenants\/[a-zA-Z0-9_]+\/users/, { timeout: 15000 });

    // Staff heading should be visible
    const staffHeading = page.getByText(/staff/i);
    await expect(staffHeading.first()).toBeVisible({ timeout: 15000 });

    // Users table should be present
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 15000 });
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
