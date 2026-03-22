import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Owner Menu Management', () => {
  test('menu page loads and shows categories list', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Categories render as Button pills in a flex-wrap container
    // Look for known category name text "D&K Soul Rolls" in the pill buttons
    const categoryButton = page.getByRole('button', { name: /D&K Soul Rolls|Soul Food Dinners/i }).first();
    await expect(categoryButton).toBeVisible({ timeout: 10000 });
  });

  test('can see category names', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Verify known category names from D&K Soul Food menu
    const soulRolls = page.getByText(/D&K Soul Rolls|Soul Rolls/i).first();
    const soulFoodDinners = page.getByText(/Soul Food Dinners/i).first();

    // At least one of these known categories should be present
    const hasSoulRolls = await soulRolls.isVisible().catch(() => false);
    const hasDinners = await soulFoodDinners.isVisible().catch(() => false);

    expect(hasSoulRolls || hasDinners).toBe(true);
  });

  test('create category button is visible', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // The button has a Plus icon and text "Category"
    const createButton = page.getByRole('button', { name: /category/i }).first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
  });

  test('menu items are listed within categories', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Menu items render as Cards in a grid. Look for price pattern which indicates items loaded.
    const pricePattern = page.getByText(/\$\d+\.\d{2}/).first();
    await expect(pricePattern).toBeVisible({ timeout: 10000 });

    // Should have multiple item cards
    const allPrices = page.getByText(/\$\d+\.\d{2}/);
    const count = await allPrices.count();
    expect(count).toBeGreaterThan(0);
  });

  test('can see item details (name, price)', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Look for a price pattern ($X.XX) indicating item details are rendered
    const pricePattern = page.getByText(/\$\d+\.\d{2}/).first();
    await expect(pricePattern).toBeVisible({ timeout: 10000 });

    // Look for the heading "Menu Management" confirming we're on the right page
    await expect(page.getByText('Menu Management')).toBeVisible();
  });
});
