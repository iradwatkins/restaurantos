import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Super Admin — Tenant Detail', () => {
  /**
   * Helper: wait for tenant data to load from Convex, then click into dk-soul-food.
   */
  async function navigateToTenantDetail(page: import('@playwright/test').Page) {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data — tenant name appears once the query resolves
    const dkTenantLink = page.locator('a[href*="/tenants/"]', { hasText: 'D & K Soul Food' }).first();
    await expect(dkTenantLink).toBeVisible({ timeout: 30000 });
    await dkTenantLink.click();

    await expect(page).toHaveURL(/\/tenants\//, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  }

  test('Navigate to dk-soul-food tenant detail page', async ({ page }) => {
    await navigateToTenantDetail(page);

    // Detail page should have content
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
  });

  test('Detail page shows tenant name and subdomain', async ({ page }) => {
    await navigateToTenantDetail(page);

    // Verify tenant name is displayed on detail page
    const tenantName = page.getByText('D & K Soul Food', { exact: false }).first();
    await expect(tenantName).toBeVisible({ timeout: 15000 });

    // Verify subdomain is displayed
    const subdomain = page.getByText('dk-soul-food', { exact: false }).first();
    await expect(subdomain).toBeVisible({ timeout: 15000 });
  });

  test('Edit controls are visible for super admin', async ({ page }) => {
    await navigateToTenantDetail(page);

    // Look for edit controls — the detail page has Settings link and Manage link
    const editControls = page.locator(
      'a:has-text("Settings"), a:has-text("Manage"), button:has-text("Edit"), button:has-text("Save"), button:has-text("Update"), [data-testid*="edit"], input, textarea'
    ).first();

    await expect(editControls).toBeVisible({ timeout: 15000 });
  });

  test('Can navigate to tenant users section', async ({ page }) => {
    await navigateToTenantDetail(page);

    // The detail page has a "Manage" link that goes to /tenants/:id/users
    const usersNav = page.locator(
      'a:has-text("Manage"), a:has-text("Users"), button:has-text("Users"), [role="tab"]:has-text("Users")'
    ).first();

    await expect(usersNav).toBeVisible({ timeout: 15000 });
    await usersNav.click();

    // Should show users content or navigate to users sub-page
    const usersContent = page.getByText(/users|team|members|staff/i).first();
    await expect(usersContent).toBeVisible({ timeout: 15000 });
  });
});
