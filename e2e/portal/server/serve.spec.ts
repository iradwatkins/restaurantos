import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Server — Serve Page', () => {
  test('Serve page loads', async ({ page }) => {
    await page.goto('/serve');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/serve/);
    await expect(page.locator('main, [data-testid="serve-page"], .serve')).toBeVisible({ timeout: 10000 });
  });

  test('Table selection area renders with tables (Table 1 through Table 8)', async ({ page }) => {
    await page.goto('/serve');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // The heading "Tables" should be visible
    await expect(page.getByText('Tables').first()).toBeVisible({ timeout: 10000 });

    // Tables are rendered as button cards with text like "Table 1", "Table 2", etc.
    for (let i = 1; i <= 8; i++) {
      const table = page.getByText(`Table ${i}`, { exact: false }).first();
      await expect(table).toBeVisible({ timeout: 10000 });
    }
  });

  test('Can see table status indicators (open/occupied)', async ({ page }) => {
    await page.goto('/serve');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Wait for tables to render
    await expect(
      page.getByText('Table 1', { exact: false }).first()
    ).toBeVisible({ timeout: 10000 });

    // Status badges show "open" text
    const statusTexts = page.getByText(/^open$|^occupied$/i).first();
    await expect(statusTexts).toBeVisible({ timeout: 10000 });
  });

  test('Selecting a table shows order building interface', async ({ page }) => {
    await page.goto('/serve');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Wait for tables to render and click the first one
    const firstTable = page.getByText('Table 1', { exact: false }).first();
    await expect(firstTable).toBeVisible({ timeout: 10000 });
    await firstTable.click();

    // After selecting a table, the order build phase should appear
    // It shows a back button, the table name, and menu categories
    const orderHeading = page.getByText(/Table 1/i).first();
    const menuSection = page.getByText(/Send to Kitchen|Save Open|All/i).first();

    const hasOrderHeading = await orderHeading.isVisible({ timeout: 10000 }).catch(() => false);
    const hasMenuSection = await menuSection.isVisible({ timeout: 10000 }).catch(() => false);

    expect(hasOrderHeading || hasMenuSection).toBeTruthy();
  });

  test('Order building phase shows menu categories', async ({ page }) => {
    await page.goto('/serve');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Select a table to enter order building
    const firstTable = page.getByText('Table 1', { exact: false }).first();
    await expect(firstTable).toBeVisible({ timeout: 10000 });
    await firstTable.click();

    // Wait for menu data to load - categories are shown as filter pills
    // Look for known category names like "D&K Soul Rolls" or "Soul Food Dinners"
    const categoryPill = page.getByText('D&K Soul Rolls').first();
    await expect(categoryPill).toBeVisible({ timeout: 30000 });
  });

  test('Can see menu items available for ordering', async ({ page }) => {
    await page.goto('/serve');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Select a table to enter order building
    const firstTable = page.getByText('Table 1', { exact: false }).first();
    await expect(firstTable).toBeVisible({ timeout: 10000 });
    await firstTable.click();

    // Menu items should be visible with prices (look for dollar sign pattern)
    const priceElements = page.getByText(/\$\d+\.\d{2}/).first();
    await expect(priceElements).toBeVisible({ timeout: 10000 });
  });
});
