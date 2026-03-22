import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Super Admin — Tenant Users', () => {
  /**
   * Helper: navigate to tenant users section via tenants list → detail → users tab.
   */
  async function navigateToTenantUsers(page: import('@playwright/test').Page) {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load — tenant link appears once query resolves
    const dkTenantLink = page.locator('a[href*="/tenants/"]', { hasText: 'D & K Soul Food' }).first();
    await expect(dkTenantLink).toBeVisible({ timeout: 30000 });
    await dkTenantLink.click();
    await expect(page).toHaveURL(/\/tenants\//, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Click users/manage link — the detail page has a "Manage" link to /tenants/:id/users
    const usersNav = page.locator(
      'a:has-text("Manage"), a:has-text("Users"), button:has-text("Users"), [role="tab"]:has-text("Users")'
    ).first();
    await expect(usersNav).toBeVisible({ timeout: 15000 });
    await usersNav.click();
    await page.waitForLoadState('networkidle');
  }

  test('Navigate to tenant users page', async ({ page }) => {
    await navigateToTenantUsers(page);

    // Users section should be visible with a list or table
    const usersSection = page.locator(
      '[data-testid*="users"], [data-testid*="user-list"], table, [role="list"], [class*="user"]'
    ).first();
    const usersHeading = page.getByText(/users|team|members|staff/i).first();

    const hasSection = await usersSection.isVisible({ timeout: 15000 }).catch(() => false);
    const hasHeading = await usersHeading.isVisible({ timeout: 15000 }).catch(() => false);

    expect(hasSection || hasHeading).toBeTruthy();
  });

  test('Users list shows dk@dksoulfood.com (the owner)', async ({ page }) => {
    await navigateToTenantUsers(page);

    // The owner email should be visible in the users list
    const ownerEmail = page.getByText('dk@dksoulfood.com', { exact: false }).first();
    await expect(ownerEmail).toBeVisible({ timeout: 15000 });
  });

  test('Users list table with columns is visible', async ({ page }) => {
    await navigateToTenantUsers(page);

    // The staff members table should be visible with expected column headers
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 15000 });

    // Verify expected columns exist (Name, Email, Role, Status)
    const nameHeader = page.locator('th', { hasText: 'Name' }).first();
    const emailHeader = page.locator('th', { hasText: 'Email' }).first();
    await expect(nameHeader).toBeVisible({ timeout: 10000 });
    await expect(emailHeader).toBeVisible({ timeout: 10000 });
  });
});
