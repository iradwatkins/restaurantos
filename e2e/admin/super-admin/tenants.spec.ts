import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Super Admin — Tenants', () => {
  test('Tenants page loads', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/tenants/);
    await expect(page.locator('main, [data-testid="tenants-page"], .tenants')).toBeVisible({ timeout: 15000 });
  });

  test('Tenant list is visible with dk-soul-food tenant showing "D & K Soul Food"', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle');

    // Wait for the table to be visible
    const tenantTable = page.locator('table').first();
    await expect(tenantTable).toBeVisible({ timeout: 15000 });

    // Wait for Convex data to load — the empty state text disappears once tenants arrive
    // The page shows "No tenants yet" or "0 restaurant clients" while loading
    // Wait for actual tenant data by looking for the tenant name with a generous timeout
    const dkTenant = page.getByText('D & K Soul Food', { exact: false }).first();
    await expect(dkTenant).toBeVisible({ timeout: 30000 });
  });

  test('Search/filter functionality is present', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle');

    // The tenants page has a search input and two <select> filter dropdowns
    const searchInput = page.locator('input[placeholder*="Search" i]').first();
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    // Verify status filter dropdown exists
    const statusFilter = page.locator('select').first();
    await expect(statusFilter).toBeVisible({ timeout: 15000 });
  });

  test('Create tenant button or action is visible', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle');

    // The page has a "New Tenant" button (Link wrapping a Button)
    const createButton = page.getByRole('link', { name: /new tenant/i });
    await expect(createButton).toBeVisible({ timeout: 15000 });
  });
});
