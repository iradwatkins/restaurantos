import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Manager Settings', () => {
  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const settingsContent = page.locator('main, [data-testid="settings-page"], [class*="settings"]').first();
    await expect(settingsContent).toBeVisible({ timeout: 10000 });
  });

  test('tab navigation is present', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Tabs show text like "Business Info", "Hours", "Tax & Fees", "Alcohol", "Staff", etc.
    await expect(page.getByText('Business Info').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Hours').first()).toBeVisible({ timeout: 10000 });
  });

  test('can view staff section', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Find and click the Staff tab
    const staffTab = page.getByText('Staff').first();
    await expect(staffTab).toBeVisible({ timeout: 10000 });
    await staffTab.click();

    // Staff section should show "Staff Management" card title
    await expect(page.getByText('Staff Management')).toBeVisible({ timeout: 10000 });
  });

  test('settings content renders in each tab', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Click through known tabs and verify each renders content
    const tabsAndContent = [
      { tab: 'Business Info', content: 'Business Information' },
      { tab: 'Hours', content: 'Business Hours' },
      { tab: 'Staff', content: 'Staff Management' },
    ];

    for (const { tab, content } of tabsAndContent) {
      await page.getByText(tab).first().click();
      await expect(page.getByText(content).first()).toBeVisible({ timeout: 10000 });
    }
  });
});
