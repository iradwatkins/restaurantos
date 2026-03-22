import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Owner Settings', () => {
  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const settingsContent = page.locator('main, [data-testid="settings-page"], [class*="settings"]').first();
    await expect(settingsContent).toBeVisible({ timeout: 10000 });
  });

  test('has tab navigation', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Settings tabs are rendered with text like "Business Info", "Hours", "Staff", etc.
    await expect(page.getByText('Business Info').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Hours').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Staff').first()).toBeVisible({ timeout: 10000 });
  });

  test('can switch between tabs', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Click the Hours tab
    const hoursTab = page.getByText('Hours').first();
    await expect(hoursTab).toBeVisible({ timeout: 10000 });
    await hoursTab.click();

    // Hours tab content should show "Business Hours" card title
    await expect(page.getByText('Business Hours')).toBeVisible({ timeout: 10000 });
  });

  test('content area updates when tabs change', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Default tab is "Business Info" - should show "Business Information" card
    await expect(page.getByText('Business Information')).toBeVisible({ timeout: 10000 });

    // Click "Staff" tab
    await page.getByText('Staff').first().click();

    // Should now show "Staff Management" content
    await expect(page.getByText('Staff Management')).toBeVisible({ timeout: 10000 });
  });
});
