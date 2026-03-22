import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Manager Orders', () => {
  test('orders page loads', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    const ordersContent = page.locator('main, [data-testid="orders-page"], [class*="orders"]').first();
    await expect(ordersContent).toBeVisible({ timeout: 10000 });
  });

  test('order list or empty state is visible', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    const orderList = page.locator(
      '[data-testid="order-list"], [class*="order-list"], [class*="orderList"], table, [role="table"]'
    ).first();
    const emptyState = page.locator(
      '[data-testid="empty-state"], [class*="empty"], :text("No orders"), :text("no orders")'
    ).first();

    const hasOrders = await orderList.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasOrders || hasEmpty).toBe(true);
  });

  test('can access order creation or POS interface', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Wait for Convex data to load (remote backend has latency)
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    const createAction = page.locator(
      'button:has-text("New Order"), button:has-text("Create Order"), a:has-text("New Order"), [data-testid="new-order"], button:has-text("POS"), a[href*="pos"]'
    ).first();
    await expect(createAction).toBeVisible({ timeout: 10000 });
  });
});
