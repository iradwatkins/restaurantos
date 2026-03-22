import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Owner Catering Management', () => {
  test('catering management page loads', async ({ page }) => {
    await page.goto('/catering-mgmt');
    await page.waitForLoadState('networkidle');

    const cateringContent = page.locator('main, [data-testid="catering-page"], [class*="catering"]').first();
    await expect(cateringContent).toBeVisible({ timeout: 10000 });
  });

  test('shows catering content', async ({ page }) => {
    await page.goto('/catering-mgmt');
    await page.waitForLoadState('networkidle');

    // Should show either a catering orders list, management interface, or empty state
    const cateringInterface = page.locator(
      '[data-testid="catering-list"], [class*="catering"], table, [role="table"], [data-testid="empty-state"], [class*="empty"], :text("No catering"), :text("catering")'
    ).first();
    await expect(cateringInterface).toBeVisible({ timeout: 10000 });
  });
});
