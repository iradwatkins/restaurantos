import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Manager Menu Management', () => {
  test('menu page loads and shows categories', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Categories render as Button pills. Look for known category names.
    const categoryButton = page.getByRole('button', { name: /D&K Soul Rolls|Soul Food Dinners/i }).first();
    await expect(categoryButton).toBeVisible({ timeout: 10000 });
  });

  test('can view menu items within a category', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Menu items are Cards with prices. Look for price pattern.
    const pricePattern = page.getByText(/\$\d+\.\d{2}/).first();
    await expect(pricePattern).toBeVisible({ timeout: 10000 });

    const allPrices = page.getByText(/\$\d+\.\d{2}/);
    const count = await allPrices.count();
    expect(count).toBeGreaterThan(0);
  });

  test('menu item details (name, price) are visible', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Verify prices are displayed in $X.XX format
    const pricePattern = page.getByText(/\$\d+\.\d{2}/).first();
    await expect(pricePattern).toBeVisible({ timeout: 10000 });

    // Verify the page heading confirms we're on menu management
    await expect(page.getByText('Menu Management')).toBeVisible();
  });
});
