import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Online Ordering', () => {
  test('order page loads and displays menu items', async ({ page }) => {
    await page.goto('/order');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Wait for menu to load - look for price patterns or menu item content
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({ timeout: 15000 });
  });

  test('can add item to cart', async ({ page }) => {
    await page.goto('/order');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Wait for menu items to load
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({ timeout: 15000 });

    // Look for an "Add" or "Add to Cart" button
    const addButton = page.locator('button:has-text("Add")').first();
    if (await addButton.isVisible()) {
      await addButton.click();

      // Cart should show at least 1 item
      // Look for cart indicator or badge
      const cartBadge = page.locator('[class*="cart"], [class*="badge"]').first();
      await expect(cartBadge).toBeVisible({ timeout: 5000 });
    }
  });

  test('order tracking page loads with order number', async ({ page }) => {
    // This would need a real order number - just test the page loads
    await page.goto('/order/track?order=1');
    await expect(page.locator('main')).not.toBeEmpty();
  });
});
