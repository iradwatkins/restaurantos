import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Owner Reports', () => {
  test('reports page loads', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    const reportsContent = page.locator('main, [data-testid="reports-page"], [class*="reports"]').first();
    await expect(reportsContent).toBeVisible({ timeout: 10000 });
  });

  test('shows chart area or data display section', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Look for chart containers, data tables, or metric cards
    const dataDisplay = page.locator(
      'canvas, svg, [data-testid="chart"], [class*="chart"], [class*="graph"], [class*="report"], [class*="metric"], [class*="stats"], [role="table"], table, [class*="card"]'
    ).first();
    await expect(dataDisplay).toBeVisible({ timeout: 10000 });
  });
});
